import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { IDBFactory } from "fake-indexeddb"
import { GET as list, POST as upload } from "../app/api/library/audio/route"
import { GET as contentList, POST as contentUpload } from "../app/api/library/content/route"
import { DELETE as contentRemove, GET as contentDownload } from "../app/api/library/content/[id]/route"
import { DELETE as remove, GET as download } from "../app/api/library/audio/[id]/route"
import { deleteAudioAsset, listAudioAssets, MAX_AUDIO_BYTES, saveAudioAsset } from "../lib/server/audio-library"
import { archiveGeneratedContent, deleteLibraryItem, getLibrarySnapshot, importBrowserContent, importSessionAudio, saveLibraryItem } from "../lib/content-library"
import { convertAudioBufferToWavArrayBuffer } from "../lib/audio-utils"
import type { AudioAsset } from "../lib/audio-library-schema"
import { useStore } from "../lib/store"
import * as api from "../lib/api-client"

const originalRoot = process.env.TRAILER_LIBRARY_DIR
const originalDirectory = process.env.TRAILER_AUDIO_LIBRARY_DIR
const originalDatabase = Object.getOwnPropertyDescriptor(globalThis, "indexedDB")
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
let directory: string
let originalState: ReturnType<typeof useStore.getState>
const globalRestores: Array<() => void> = []
const metadata: AudioAsset = {
  id: "retained-audio", type: "audio", title: "The Last Espresso", script: "One cup. One chance.",
  parameters: { genre: "Comedy" }, mode: "blockbuster", createdAt: 123, extension: "wav", duration: 0.01,
}
const wav = new Uint8Array(convertAudioBufferToWavArrayBuffer({
  numberOfChannels: 1, sampleRate: 8_000, length: 80, getChannelData: () => new Float32Array(80).fill(0.25),
} as unknown as AudioBuffer))

beforeEach(async () => {
  originalState = useStore.getState()
  directory = await mkdtemp(path.join(tmpdir(), "trailer-audio-test-"))
  process.env.TRAILER_LIBRARY_DIR = directory
  process.env.TRAILER_AUDIO_LIBRARY_DIR = path.join(directory, "audio")
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: new IDBFactory() })
})

afterEach(async () => {
  const audioUrl = useStore.getState().audioGenerationStatus.audioUrl
  if (audioUrl && audioUrl !== originalState.audioGenerationStatus.audioUrl) URL.revokeObjectURL(audioUrl)
  useStore.setState(originalState, true)
  while (globalRestores.length) globalRestores.pop()!()
  mock.restore()
  if (originalRoot === undefined) delete process.env.TRAILER_LIBRARY_DIR
  else process.env.TRAILER_LIBRARY_DIR = originalRoot
  if (originalDirectory === undefined) delete process.env.TRAILER_AUDIO_LIBRARY_DIR
  else process.env.TRAILER_AUDIO_LIBRARY_DIR = originalDirectory
  if (originalDatabase) Object.defineProperty(globalThis, "indexedDB", originalDatabase)
  else Reflect.deleteProperty(globalThis, "indexedDB")
  if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage)
  else Reflect.deleteProperty(globalThis, "sessionStorage")
  await rm(directory, { recursive: true, force: true })
})

function replaceGlobal(name: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  globalRestores.push(() => {
    if (original) Object.defineProperty(globalThis, name, original)
    else Reflect.deleteProperty(globalThis, name)
  })
}

function uploadRequest(item: unknown = metadata, bytes = wav, headers: Record<string, string> = {}) {
  const form = new FormData()
  form.append("metadata", JSON.stringify(item))
  form.append("audio", new Blob([bytes], { type: "audio/wav" }), "audio.wav")
  return new Request("http://localhost:3000/api/library/audio", { method: "POST", headers, body: form })
}

function connectClientToRoutes() {
  return spyOn(globalThis, "fetch").mockImplementation((async (input: URL | RequestInfo, init?: RequestInit) => {
    if (String(input).startsWith("/assets/")) return new Response(wav)
    const req = new Request(new URL(String(input), "http://localhost:3000"), init)
    if (req.url.endsWith("/api/library/audio")) return req.method === "POST" ? upload(req) : list(req)
    if (new URL(req.url).pathname === "/api/library/content") return req.method === "POST" ? contentUpload(req) : contentList(req)
    const id = decodeURIComponent(new URL(req.url).pathname.split("/").at(-1)!)
    const context = { params: Promise.resolve({ id }) }
    if (new URL(req.url).pathname.startsWith("/api/library/content/")) return req.method === "DELETE" ? contentRemove(req, context) : contentDownload(req, context)
    return req.method === "DELETE" ? remove(req, context) : download(req, context)
  }) as typeof globalThis.fetch)
}

describe("durable audio routes", () => {
  test("persists exact WAV and metadata outside browser/build caches, including fresh reads", async () => {
    expect((await upload(uploadRequest())).status).toBe(201)
    expect(await listAudioAssets()).toEqual({ items: [metadata], deletedIds: [] })
    expect(new Uint8Array(await readFile(path.join(directory, "audio", metadata.id, "audio.wav")))).toEqual(wav)
    const response = await download(new Request("http://localhost:3000/api/library/audio/retained-audio"), { params: Promise.resolve({ id: metadata.id }) })
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("content-type")).toBe("audio/wav")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(wav)
    expect((await list(new Request("http://localhost:3000/api/library/audio"))).headers.get("cache-control")).toBe("private, no-store")
  })

  test("concurrent saves retain both assets and retries do not replace their bytes", async () => {
    const second = { ...metadata, id: "second-audio", createdAt: 124 }
    await Promise.all([saveAudioAsset(metadata, wav), saveAudioAsset(second, wav), saveAudioAsset(metadata, wav)])
    expect((await listAudioAssets()).items).toEqual([second, metadata])
  })

  test("rejects path traversal, invalid metadata, non-WAV bytes and foreign origins", async () => {
    expect((await upload(uploadRequest({ ...metadata, id: "../outside" }))).status).toBe(400)
    expect((await upload(uploadRequest({ ...metadata, duration: -1 }))).status).toBe(400)
    expect((await upload(uploadRequest(metadata, new Uint8Array(44)))).status).toBe(400)
    expect((await upload(uploadRequest(metadata, wav, { Origin: "https://foreign.example" }))).status).toBe(403)
    expect((await list(new Request("http://localhost:3000/api/library/audio", { headers: { "Sec-Fetch-Site": "cross-site" } }))).status).toBe(403)
    expect((await download(new Request("http://localhost:3000/api/library/audio/x"), { params: Promise.resolve({ id: "../x" }) })).status).toBe(400)
    expect((await remove(new Request("http://localhost:3000/api/library/audio/x", { method: "DELETE", headers: { "Content-Type": "text/plain" } }), { params: Promise.resolve({ id: metadata.id }) })).status).toBe(415)
    expect((await listAudioAssets()).items).toEqual([])
  })

  test("rejects oversized chunked uploads before parsing the complete form", async () => {
    const chunk = new Uint8Array(1024 * 1024)
    let emitted = 0
    let cancelled = false
    const body = new ReadableStream({
      pull(controller) { emitted++; controller.enqueue(chunk) },
      cancel() { cancelled = true },
    })
    const req = new Request("http://localhost:3000/api/library/audio", {
      method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=too-large" }, body,
    })
    expect((await upload(req)).status).toBe(413)
    expect(cancelled).toBe(true)
    expect(emitted).toBeLessThanOrEqual(MAX_AUDIO_BYTES / chunk.length + 2)
  })

  test("reports disk failures without exposing host paths", async () => {
    const file = path.join(directory, "not-a-directory")
    await writeFile(file, "occupied")
    process.env.TRAILER_AUDIO_LIBRARY_DIR = file
    const response = await upload(uploadRequest())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(directory)
  })
})

describe("Library recovery from server audio", () => {
  test("reads, plays and downloads identical audio after all browser storage is purged", async () => {
    connectClientToRoutes()
    expect(await archiveGeneratedContent({ ...metadata, media: new Blob([wav], { type: "audio/wav" }) })).toBe(true)
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: new IDBFactory() })
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => null } })
    const snapshot = await getLibrarySnapshot()
    expect(snapshot.items).toEqual([{ ...metadata, mediaUrl: `/api/library/content/${metadata.id}`, downloadUrl: `/api/library/content/${metadata.id}?download=1` }])
    const file = await fetch(snapshot.items[0].mediaUrl!)
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(wav)
  })

  test("unavailable IndexedDB cannot block audio archiving, reads or deletion", async () => {
    connectClientToRoutes()
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined })
    expect(await archiveGeneratedContent({ ...metadata, media: new Blob([wav], { type: "audio/wav" }) })).toBe(true)
    expect((await getLibrarySnapshot()).browserStorageAvailable).toBe(false)
    expect((await getLibrarySnapshot()).items).toHaveLength(1)
    await deleteLibraryItem(metadata.id, "audio")
    expect((await getLibrarySnapshot()).items).toHaveLength(0)
  })

  test("failed durable saves retain a browser fallback and report archive failure", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(new Response("Offline", { status: 503 }))
    expect(await archiveGeneratedContent({ ...metadata, media: new Blob([wav], { type: "audio/wav" }) })).toBe(false)
    const snapshot = await getLibrarySnapshot()
    expect(snapshot.archiveAvailable).toBe(false)
    expect(await snapshot.items[0].media?.arrayBuffer()).toEqual(wav.buffer)
  })

  test("successful archive reads do not claim failed migrations are backed up", async () => {
    spyOn(globalThis, "fetch").mockImplementation((async (_input: URL | RequestInfo, init?: RequestInit) => {
      if (init?.method === "POST") return new Response("Disk full", { status: 503 })
      return Response.json({ items: [], deletedIds: [] })
    }) as typeof globalThis.fetch)
    expect(await archiveGeneratedContent({ ...metadata, media: new Blob([wav], { type: "audio/wav" }) })).toBe(false)
    await importBrowserContent()
    const snapshot = await getLibrarySnapshot()
    expect(snapshot.archiveAvailable).toBe(true)
    expect(snapshot.browserOnlyCount).toBe(1)
    expect(new Uint8Array(await snapshot.items[0].media!.arrayBuffer())).toEqual(wav)
  })

  test("migrates browser audio once and server deletion survives stale browser/session copies", async () => {
    // Seed an existing browser-only asset while the server is unavailable.
    const fetch = spyOn(globalThis, "fetch").mockResolvedValue(new Response("Offline", { status: 503 }))
    expect(await archiveGeneratedContent({ ...metadata, media: new Blob([wav], { type: "audio/wav" }) })).toBe(false)
    fetch.mockRestore()
    connectClientToRoutes()
    await importBrowserContent()
    await importBrowserContent()
    expect((await listAudioAssets()).items).toEqual([metadata])
    await deleteAudioAsset(metadata.id) // Another browser deletes it; this cache is stale.
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => JSON.stringify([{
      ...metadata, timestamp: new Date(metadata.createdAt).toISOString(), url: "blob:legacy", backgroundMusicId: "music",
    }]) } })
    await importBrowserContent()
    await importSessionAudio()
    expect((await getLibrarySnapshot()).items).toEqual([])
    expect((await upload(uploadRequest())).status).toBe(410)
  })

  test("deletion removes both durable and browser copies without restoring deleted audio", async () => {
    connectClientToRoutes()
    await saveLibraryItem({ ...metadata, media: new Blob([wav], { type: "audio/wav" }) })
    await deleteLibraryItem(metadata.id, "audio")
    expect((await getLibrarySnapshot()).items).toEqual([])
    await importBrowserContent()
    expect((await listAudioAssets()).items).toEqual([])
  })
})

describe("generated audio retention", () => {
  function prepareAudioGeneration() {
    class TestAudioBuffer {
      numberOfChannels: number
      length: number
      sampleRate: number
      channels: Float32Array[]
      constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
        this.numberOfChannels = options.numberOfChannels; this.length = options.length; this.sampleRate = options.sampleRate
        this.channels = Array.from({ length: options.numberOfChannels }, () => new Float32Array(options.length).fill(0.25))
      }
      get duration() { return this.length / this.sampleRate }
      getChannelData(channel: number) { return this.channels[channel] }
      copyToChannel(values: Float32Array, channel: number) { this.channels[channel].set(values) }
    }
    replaceGlobal("AudioBuffer", TestAudioBuffer)
    replaceGlobal("OfflineAudioContext", class {
      destination = {}
      output: TestAudioBuffer
      constructor(channels: number, length: number, sampleRate: number) {
        this.output = new TestAudioBuffer({ numberOfChannels: channels, length, sampleRate })
      }
      createBufferSource() { return { buffer: null, connect() {}, start() {} } }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} } }
      async startRendering() { return this.output }
    })
    const client = new api.ApiClient("test", "test")
    spyOn(api, "getApiClientAsync").mockResolvedValue(client)
    spyOn(client, "generateVoiceover").mockResolvedValue(wav.buffer)
    useStore.setState({ currentScript: metadata.script, movieTitle: metadata.title, parameters: { ...originalState.parameters, ...metadata.parameters } })
    return { current: { decodeAudioData: async () => new TestAudioBuffer({ numberOfChannels: 1, length: 80, sampleRate: 8_000 }) } as unknown as AudioContext }
  }

  test("generation archives the actual mixed WAV and source snapshot without session history", async () => {
    const fetch = connectClientToRoutes()
    const sessionWrite = mock(() => {})
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => null, setItem: sessionWrite } })
    expect(await useStore.getState().generateTrailerAudio(mock(() => {}), prepareAudioGeneration())).toBe(true)
    expect(useStore.getState().audioGenerationStatus.status).toBe("success")
    expect(sessionWrite).not.toHaveBeenCalled()
    expect(fetch.mock.calls.some(([url]) => String(url).startsWith("blob:"))).toBe(false)
    const [saved] = (await listAudioAssets()).items
    expect(saved.title).toBe(metadata.title)
    expect(saved.script).toBe(metadata.script)
    expect(new Uint8Array(await readFile(path.join(directory, "audio", saved.id, "audio.wav")))).toEqual(wav)
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: new IDBFactory() })
    expect((await getLibrarySnapshot()).items[0].id).toBe(saved.id)
  })

  test("failed durable and browser saves keep generated audio playable and warn accurately", async () => {
    const nativeFetch = globalThis.fetch
    const refs = prepareAudioGeneration()
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined })
    spyOn(globalThis, "fetch").mockImplementation((async (input: URL | RequestInfo) =>
      String(input).startsWith("/assets/") ? new Response(wav) : new Response("Disk full", { status: 503 })
    ) as typeof globalThis.fetch)
    const toast = mock(() => {})
    expect(await useStore.getState().generateTrailerAudio(toast, refs)).toBe(true)
    const status = useStore.getState().audioGenerationStatus
    expect(status.status).toBe("success")
    expect(new Uint8Array(await (await nativeFetch(status.audioUrl!)).arrayBuffer())).toEqual(wav)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Audio wasn't backed up" }))
  })
})
