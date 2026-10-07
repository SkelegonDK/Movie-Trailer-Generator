import { getSavedAudioTracks } from "./audio-utils"
import type { MovieParameters, ParameterMode } from "./parameter-modes"

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
  extension: string
  duration?: number
}

type NewContent = Omit<LibraryItem, "id" | "createdAt" | "extension"> & {
  id?: string
  createdAt?: number
  extension?: string
  url?: string
}

export const LIBRARY_CHANGED_EVENT = "trailer-library-changed"
const DB_NAME = "trailer-content-library"
const STORE_NAME = "content"

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

export async function getLibraryItems(): Promise<LibraryItem[]> {
  const items = await transaction<LibraryItem[]>("readonly", (store) => store.getAll())
  return items.sort((a, b) => b.createdAt - a.createdAt)
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
  await transaction("readwrite", (store) => store.put(item))
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

export async function deleteLibraryItem(id: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(id))
  notifyChange()
}

/** Recover audio from the older session history while its file is still available. */
export async function importSessionAudio(): Promise<void> {
  const existing = new Set((await getLibraryItems()).map((item) => item.id))
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
    await saveLibraryItem({
      id: track.id, type: "audio", title: track.title, script: track.script,
      parameters: track.parameters, createdAt: track.timestamp.getTime(),
      duration: track.duration, extension: "wav", media,
    })
  }
}
