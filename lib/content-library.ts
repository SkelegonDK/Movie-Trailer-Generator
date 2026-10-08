import { deleteAudioTrack, getSavedAudioTracks } from "./audio-utils"
import type { MovieParameters, ParameterMode } from "./parameter-modes"
import { audioArchiveSchema, audioAssetSchema } from "./audio-library-schema"

export type ContentType = "script" | "audio" | "poster" | "video"

export interface LibraryItem {
  id: string
  type: ContentType
  title: string
  script: string
  parameters: Partial<MovieParameters>
  mode?: ParameterMode
  createdAt: number
  media?: Blob
  mediaUrl?: string
  extension: string
  duration?: number
}

type NewContent = Omit<LibraryItem, "id" | "createdAt" | "extension" | "mediaUrl"> & {
  id?: string
  createdAt?: number
  extension?: string
  url?: string
}

export const LIBRARY_CHANGED_EVENT = "trailer-library-changed"
const DB_NAME = "trailer-content-library"
const STORE_NAME = "content"
const AUDIO_ARCHIVE_URL = "/api/library/audio"

function audioUrl(id: string) { return `${AUDIO_ARCHIVE_URL}/${encodeURIComponent(id)}` }

async function getAudioArchive() {
  const response = await fetch(AUDIO_ARCHIVE_URL, { cache: "no-store" })
  if (!response.ok) throw new Error("The server audio archive is unavailable")
  return audioArchiveSchema.parse(await response.json())
}

async function saveDurableAudio(item: LibraryItem) {
  const metadata = audioAssetSchema.parse(item)
  if (!item.media) throw new Error("The audio file is missing")
  const form = new FormData()
  form.append("metadata", JSON.stringify(metadata))
  form.append("audio", item.media, "audio.wav")
  const response = await fetch(AUDIO_ARCHIVE_URL, { method: "POST", body: form })
  if (!response.ok) throw new Error("Audio could not be saved to the server archive")
  return audioAssetSchema.parse(await response.json())
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser storage is unavailable"))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error("Close other studio tabs and try again"))
  })
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const request = action(tx.objectStore(STORE_NAME))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error ?? request.error)
      tx.onabort = () => reject(tx.error ?? new Error("Library update was interrupted"))
    })
  } finally {
    db.close()
  }
}

function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT))
}

export async function getLibrarySnapshot() {
  const [local, archive] = await Promise.allSettled([
    transaction<LibraryItem[]>("readonly", (store) => store.getAll()),
    getAudioArchive(),
  ])
  if (local.status === "rejected" && archive.status === "rejected") throw new Error("Library storage is unavailable")
  const items = new Map<string, LibraryItem>()
  const removed = new Set(archive.status === "fulfilled" ? archive.value.deletedIds : [])
  if (local.status === "fulfilled") {
    for (const item of local.value) if (!removed.has(item.id)) items.set(item.id, item)
  }
  if (archive.status === "fulfilled") {
    for (const item of archive.value.items) items.set(item.id, { ...item, mediaUrl: audioUrl(item.id) })
  }
  return {
    items: [...items.values()].sort((a, b) => b.createdAt - a.createdAt),
    audioArchiveAvailable: archive.status === "fulfilled",
    browserStorageAvailable: local.status === "fulfilled",
    browserOnlyAudioCount: [...items.values()].filter((item) => item.type === "audio" && !item.mediaUrl).length,
  }
}

export async function getLibraryItems(): Promise<LibraryItem[]> {
  return (await getLibrarySnapshot()).items
}

export async function saveLibraryItem(content: NewContent): Promise<LibraryItem> {
  const { url, ...data } = content
  let media = content.media
  if (!media && url) {
    const response = await fetch(url)
    if (!response.ok) throw new Error("Could not save the generated file")
    media = await response.blob()
  }
  if (content.type !== "script" && !media) throw new Error("The generated file is missing")
  const parameters: Partial<MovieParameters> = {}
  for (const key of ["genre", "setting", "character", "conflict", "plotTwist"] as const) {
    const value = content.parameters?.[key]
    if (typeof value === "string") parameters[key] = value
  }
  const extension = content.extension ?? (content.type === "script" ? "txt" : media?.type.split("/")[1]?.split(";")[0] || "bin")
  const item: LibraryItem = {
    ...data,
    parameters,
    id: content.id ?? crypto.randomUUID(),
    title: content.title.trim() || "Untitled trailer",
    createdAt: content.createdAt ?? Date.now(),
    extension,
    media,
  }
  // Store the file itself: object URLs stop working after a reload or revocation.
  if (item.type === "audio") {
    // Browser storage is a fallback, never a prerequisite for a durable save.
    let archiveError: unknown
    try { await saveDurableAudio(item) } catch (error) { archiveError = error }
    try { await transaction("readwrite", (store) => store.put(item)) } catch { /* audio can be read directly from the server */ }
    if (archiveError) throw archiveError
  } else {
    await transaction("readwrite", (store) => store.put(item))
  }
  notifyChange()
  return item
}

/** Archiving is optional and must never turn a completed generation into a failure. */
export async function archiveGeneratedContent(content: NewContent): Promise<boolean> {
  try {
    await saveLibraryItem(content)
    return true
  } catch {
    return false
  }
}

export async function deleteLibraryItem(id: string, type?: ContentType): Promise<void> {
  if (!type) {
    try { type = (await transaction<LibraryItem | undefined>("readonly", (store) => store.get(id)))?.type }
    catch { /* audio may exist only on the server */ }
  }
  if (type === "audio" || !type) {
    const response = await fetch(audioUrl(id), { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" })
    if (!response.ok) throw new Error("The server audio file could not be deleted")
    // Tombstones prevent stale caches or migration from restoring this asset.
    try { await transaction("readwrite", (store) => store.delete(id)) } catch { /* durable deletion already succeeded */ }
    deleteAudioTrack(id)
  } else {
    await transaction("readwrite", (store) => store.delete(id))
  }
  notifyChange()
}

/** Back up retained browser audio before browser storage can be cleared. */
export async function importBrowserAudio(): Promise<void> {
  const [local, archive] = await Promise.all([
    transaction<LibraryItem[]>("readonly", (store) => store.getAll()),
    getAudioArchive(),
  ])
  const existing = new Set([...archive.items.map((item) => item.id), ...archive.deletedIds])
  for (const item of local) {
    if (item.type !== "audio" || !item.media || existing.has(item.id)) continue
    try { await saveDurableAudio(item); existing.add(item.id) }
    catch { /* keep the browser copy and retry on the next visit */ }
  }
}

/** Recover audio from the older session history while its file is still available. */
export async function importSessionAudio(): Promise<void> {
  const existing = new Set((await getLibraryItems()).map((item) => item.id))
  try { for (const id of (await getAudioArchive()).deletedIds) existing.add(id) } catch { /* retain readable legacy audio locally */ }
  for (const track of getSavedAudioTracks()) {
    if (existing.has(track.id)) continue
    let media: Blob
    try {
      const response = await fetch(track.url)
      if (!response.ok) continue
      media = await response.blob()
    } catch {
      continue // Old object URLs cannot be recovered after the original document closes.
    }
    try { await saveLibraryItem({
      id: track.id, type: "audio", title: track.title, script: track.script,
      parameters: track.parameters, createdAt: track.timestamp.getTime(),
      duration: track.duration, extension: "wav", media,
    }); existing.add(track.id) } catch { /* best effort; storage failures must not stop the Library */ }
  }
}
