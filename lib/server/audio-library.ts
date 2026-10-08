import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { audioAssetIdSchema, audioAssetSchema, type AudioAsset } from "../audio-library-schema"

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024

export class AudioArchiveError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

function archiveDirectory() {
  // Runtime data belongs on a persistent disk, never in the deployment bundle.
  return path.resolve(/* turbopackIgnore: true */ process.env.TRAILER_AUDIO_LIBRARY_DIR || path.join(process.cwd(), ".trailer-library", "audio"))
}

function assetId(value: string) {
  const parsed = audioAssetIdSchema.safeParse(value)
  if (!parsed.success) throw new AudioArchiveError("Invalid audio asset ID", 400)
  return parsed.data
}

function isMissing(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT"
}

async function deleted(root: string, id: string) {
  try { await readFile(path.join(root, ".deleted", id)); return true }
  catch (error) { if (isMissing(error)) return false; throw error }
}

async function readMetadata(root: string, id: string): Promise<AudioAsset> {
  const item = audioAssetSchema.parse(JSON.parse(await readFile(path.join(root, id, "metadata.json"), "utf8")))
  if (item.id !== id) throw new Error("Audio metadata does not match its directory")
  return item
}

export async function listAudioAssets() {
  const root = archiveDirectory()
  let entries
  try { entries = await readdir(/* turbopackIgnore: true */ root, { withFileTypes: true }) }
  catch (error) { if (isMissing(error)) return { items: [], deletedIds: [] }; throw error }
  let deletedIds: string[] = []
  try { deletedIds = (await readdir(path.join(root, ".deleted"))).filter((id) => audioAssetIdSchema.safeParse(id).success) }
  catch (error) { if (!isMissing(error)) throw error }
  const removed = new Set(deletedIds)
  const items: AudioAsset[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !audioAssetIdSchema.safeParse(entry.name).success || removed.has(entry.name)) continue
    try { items.push(await readMetadata(root, entry.name)) }
    catch (error) {
      if (isMissing(error)) continue // A concurrent deletion can remove the directory.
      throw error
    }
  }
  return { items: items.sort((a, b) => b.createdAt - a.createdAt), deletedIds }
}

export async function saveAudioAsset(metadata: AudioAsset, bytes: Uint8Array): Promise<AudioAsset> {
  const item = audioAssetSchema.parse(metadata)
  if (bytes.length > MAX_AUDIO_BYTES) throw new AudioArchiveError("Audio files must be at most 100 MB", 413)
  if (bytes.length < 44 || new TextDecoder().decode(bytes.subarray(0, 4)) !== "RIFF" || new TextDecoder().decode(bytes.subarray(8, 12)) !== "WAVE") {
    throw new AudioArchiveError("A WAV audio file is required", 400)
  }
  const root = archiveDirectory()
  await mkdir(root, { recursive: true })
  if (await deleted(root, item.id)) throw new AudioArchiveError("This audio asset was deleted", 410)
  // Publish metadata and audio together. A crash never exposes a half-written item.
  const pending = await mkdtemp(path.join(root, ".pending-"))
  try {
    await writeFile(path.join(pending, "audio.wav"), bytes)
    await writeFile(path.join(pending, "metadata.json"), JSON.stringify(item))
    try { await rename(pending, path.join(/* turbopackIgnore: true */ root, item.id)) }
    catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error
      // Retried uploads and migrations are idempotent; existing assets are immutable.
    }
    if (await deleted(root, item.id)) {
      await rm(path.join(/* turbopackIgnore: true */ root, item.id), { recursive: true, force: true })
      throw new AudioArchiveError("This audio asset was deleted", 410)
    }
    return await readMetadata(root, item.id)
  } finally { await rm(pending, { recursive: true, force: true }) }
}

export async function readAudioAsset(value: string) {
  const id = assetId(value)
  const root = archiveDirectory()
  if (await deleted(root, id)) throw new AudioArchiveError("Audio asset not found", 404)
  try { return await readFile(path.join(root, id, "audio.wav")) }
  catch (error) { if (isMissing(error)) throw new AudioArchiveError("Audio asset not found", 404); throw error }
}

export async function deleteAudioAsset(value: string) {
  const id = assetId(value)
  const root = archiveDirectory()
  await mkdir(path.join(root, ".deleted"), { recursive: true })
  // Keep a tombstone so an older browser cache cannot migrate this asset back.
  await writeFile(path.join(root, ".deleted", id), "deleted")
  await rm(path.join(/* turbopackIgnore: true */ root, id), { recursive: true, force: true })
}
