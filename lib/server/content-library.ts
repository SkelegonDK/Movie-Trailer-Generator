import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { audioAssetIdSchema } from "../audio-library-schema"
import { libraryAssetSchema, type AssetType, type LibraryAsset } from "../library-schema"

const TYPES: AssetType[] = ["script", "audio", "poster", "video"]
export const MAX_ASSET_BYTES = { script: 1024 * 1024, audio: 100 * 1024 * 1024, poster: 25 * 1024 * 1024, video: 250 * 1024 * 1024 }

export class ArchiveError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

function archiveRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.TRAILER_LIBRARY_DIR || path.join(process.cwd(), ".trailer-library"))
}
function root(type: AssetType) {
  // Runtime assets are not inputs to the deployment bundle.
  if (type === "audio" && process.env.TRAILER_AUDIO_LIBRARY_DIR) return path.resolve(/* turbopackIgnore: true */ process.env.TRAILER_AUDIO_LIBRARY_DIR)
  return path.join(/* turbopackIgnore: true */ archiveRoot(), type)
}
function id(value: string) {
  const result = audioAssetIdSchema.safeParse(value)
  if (!result.success) throw new ArchiveError("Invalid asset ID", 400)
  return result.data
}
function missing(error: unknown) { return (error as NodeJS.ErrnoException)?.code === "ENOENT" }
function filename(item: LibraryAsset) { return `${item.type}.${item.extension}` }
async function deleted(directory: string, assetId: string) {
  // Read legacy type-local markers as well as current archive-wide tombstones.
  for (const markers of [path.join(archiveRoot(), ".deleted"), path.join(directory, ".deleted")]) {
    try { await readFile(path.join(markers, assetId)); return true }
    catch (error) { if (!missing(error)) throw error }
  }
  return false
}

export const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024
// Tombstones consume records too: stale browser copies must not restore deleted assets.
export const MAX_ARCHIVE_RECORDS = 1000

async function withArchiveLock<T>(run: () => Promise<T>): Promise<T> {
  const directory = archiveRoot()
  await mkdir(directory, { recursive: true })
  const lock = path.join(directory, ".archive-lock")
  const deadline = Date.now() + 5_000
  while (true) {
    try { await mkdir(lock); break }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      if (Date.now() >= deadline) throw new ArchiveError("The archive is busy; try again later", 503)
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  try { return await run() }
  finally { await rm(lock, { recursive: true, force: true }) }
}

async function archiveUsage() {
  let bytes = 0
  const records = new Set<string>()
  async function scan(directory: string, markers = false) {
    let entries
    try { entries = await readdir(/* turbopackIgnore: true */ directory, { withFileTypes: true }) }
    catch (error) { if (missing(error)) return; throw error }
    for (const entry of entries) {
      // Symlinks could point beyond the archive; never follow or accept them.
      if (entry.isSymbolicLink()) throw new ArchiveError("Archive symlinks are not supported", 503)
      if (audioAssetIdSchema.safeParse(entry.name).success && (entry.isDirectory() || markers)) records.add(entry.name)
      const file = path.join(/* turbopackIgnore: true */ directory, entry.name)
      if (entry.isDirectory()) await scan(file, entry.name === ".deleted")
      else bytes += (await stat(/* turbopackIgnore: true */ file)).size
    }
  }
  for (const directory of new Set(TYPES.map(root))) await scan(directory)
  await scan(path.join(archiveRoot(), ".deleted"), true)
  return { bytes, records }
}

async function metadata(directory: string, assetId: string) {
  const item = libraryAssetSchema.parse(JSON.parse(await readFile(path.join(directory, assetId, "metadata.json"), "utf8")))
  if (item.id !== assetId) throw new Error("Asset metadata does not match its directory")
  return item
}

function validateBytes(item: LibraryAsset, bytes: Uint8Array) {
  const text = (start: number, end: number) => new TextDecoder().decode(bytes.subarray(start, end))
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value)
  let valid = bytes.length > 0
  switch (item.extension) {
    case "wav": valid = bytes.length >= 44 && text(0, 4) === "RIFF" && text(8, 12) === "WAVE"; break
    case "mp4": valid = bytes.length >= 12 && text(4, 8) === "ftyp"; break
    case "webm": valid = starts(0x1a, 0x45, 0xdf, 0xa3); break
    case "png": valid = starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a); break
    case "jpg": case "jpeg": valid = starts(0xff, 0xd8, 0xff); break
    case "webp": valid = text(0, 4) === "RIFF" && text(8, 12) === "WEBP"; break
    case "gif": valid = ["GIF87a", "GIF89a"].includes(text(0, 6)); break
    case "avif": valid = text(4, 8) === "ftyp" && /avif|avis/.test(text(8, 32)); break
    case "txt": valid = text(0, bytes.length) === item.script; break
  }
  if (!valid) throw new ArchiveError("The file does not match its declared format", 400)
}

export async function listContentAssets(type?: AssetType) {
  const items: LibraryAsset[] = [], deletedIds = new Set<string>()
  try { for (const value of await readdir(path.join(archiveRoot(), ".deleted"))) if (audioAssetIdSchema.safeParse(value).success) deletedIds.add(value) }
  catch (error) { if (!missing(error)) throw error }
  for (const kind of type ? [type] : TYPES) {
    const directory = root(kind)
    let entries
    try { entries = await readdir(/* turbopackIgnore: true */ directory, { withFileTypes: true }) }
    catch (error) { if (missing(error)) continue; throw error }
    try { for (const value of await readdir(path.join(directory, ".deleted"))) if (audioAssetIdSchema.safeParse(value).success) deletedIds.add(value) }
    catch (error) { if (!missing(error)) throw error }
    for (const entry of entries) {
      if (!entry.isDirectory() || !audioAssetIdSchema.safeParse(entry.name).success || deletedIds.has(entry.name)) continue
      try {
        const item = await metadata(directory, entry.name)
        if (item.type === kind) items.push(item)
      } catch (error) { if (missing(error)) continue; throw error }
    }
  }
  return { items: items.filter((item) => !deletedIds.has(item.id)).sort((a, b) => b.createdAt - a.createdAt), deletedIds: [...deletedIds] }
}

export async function saveContentAsset(input: LibraryAsset, bytes: Uint8Array) {
  return withArchiveLock(() => saveContentAssetLocked(input, bytes))
}
async function saveContentAssetLocked(input: LibraryAsset, bytes: Uint8Array) {
  const item = libraryAssetSchema.parse(input)
  if (bytes.length > MAX_ASSET_BYTES[item.type]) throw new ArchiveError("The file exceeds the archive size limit", 413)
  validateBytes(item, bytes)
  const directory = root(item.type)
  await mkdir(directory, { recursive: true })
  if (await deleted(directory, item.id)) throw new ArchiveError("This asset was deleted", 410)
  try { return await metadata(directory, item.id) }
  catch (error) { if (!missing(error)) throw error }
  const usage = await archiveUsage()
  const metadataBytes = new TextEncoder().encode(JSON.stringify(item)).length
  if (usage.bytes + bytes.length + metadataBytes > MAX_ARCHIVE_BYTES || (!usage.records.has(item.id) && usage.records.size >= MAX_ARCHIVE_RECORDS)) {
    throw new ArchiveError("The shared archive is full; download a copy and contact its owner", 507)
  }
  const pending = await mkdtemp(path.join(directory, ".pending-"))
  try {
    await writeFile(path.join(/* turbopackIgnore: true */ pending, filename(item)), bytes)
    await writeFile(path.join(pending, "metadata.json"), JSON.stringify(item))
    try { await rename(pending, path.join(/* turbopackIgnore: true */ directory, item.id)) }
    catch (error) { if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error }
    if (await deleted(directory, item.id)) {
      await rm(path.join(/* turbopackIgnore: true */ directory, item.id), { recursive: true, force: true })
      throw new ArchiveError("This asset was deleted", 410)
    }
    return await metadata(directory, item.id)
  } finally { await rm(pending, { recursive: true, force: true }) }
}

export async function getContentFile(value: string, type?: AssetType) {
  const assetId = id(value)
  for (const kind of type ? [type] : TYPES) {
    const directory = root(kind)
    if (await deleted(directory, assetId)) throw new ArchiveError("Asset not found", 404)
    try {
      const item = await metadata(directory, assetId)
      const filePath = path.join(/* turbopackIgnore: true */ directory, assetId, filename(item))
      const info = await stat(/* turbopackIgnore: true */ filePath)
      return { item, filePath, size: info.size }
    } catch (error) { if (missing(error)) continue; throw error }
  }
  throw new ArchiveError("Asset not found", 404)
}

export async function deleteContentAsset(value: string, type?: AssetType) {
  const assetId = id(value)
  return withArchiveLock(async () => {
    const usage = await archiveUsage()
    if (!usage.records.has(assetId) && usage.records.size >= MAX_ARCHIVE_RECORDS) {
      throw new ArchiveError("The shared archive is full", 507)
    }
    // One archive-wide tombstone replaces the asset's record without growing the record count.
    const markers = path.join(archiveRoot(), ".deleted")
    await mkdir(markers, { recursive: true })
    await writeFile(path.join(markers, assetId), "deleted")
    for (const kind of type ? [type] : TYPES) {
      await rm(path.join(/* turbopackIgnore: true */ root(kind), assetId), { recursive: true, force: true })
    }
  })
}
