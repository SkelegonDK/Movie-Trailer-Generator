import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { IDBFactory } from "fake-indexeddb"
import { GET as list, POST as upload } from "../app/api/library/content/route"
import { DELETE as remove, GET as download } from "../app/api/library/content/[id]/route"
import { archiveGeneratedContent, getLibrarySnapshot, importBrowserContent, saveLibraryItem } from "../lib/content-library"
import { deleteContentAsset, listContentAssets, saveContentAsset } from "../lib/server/content-library"
import type { LibraryAsset } from "../lib/library-schema"

const originalDatabase = Object.getOwnPropertyDescriptor(globalThis, "indexedDB")
const originalRoot = process.env.TRAILER_LIBRARY_DIR
const originalAudioRoot = process.env.TRAILER_AUDIO_LIBRARY_DIR
let directory: string
const video = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4, 5])
const poster = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])
const base: LibraryAsset = { id: "shared-video", type: "video", title: "Shared trailer", script: "One hero.", parameters: {}, createdAt: 1, extension: "webm", duration: 1 }

function newBrowser() { Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: new IDBFactory() }) }
function request(id = base.id, headers?: HeadersInit, suffix = "") { return new Request(`http://localhost:3000/api/library/content/${id}${suffix}`, { headers }) }
function context(id = base.id) { return { params: Promise.resolve({ id }) } }
function uploadRequest(item: unknown, bytes: Uint8Array) {
  const form = new FormData()
  form.append("metadata", JSON.stringify(item))
  form.append("media", new Blob([new Uint8Array(bytes)]), "file")
  return new Request("http://localhost:3000/api/library/content", { method: "POST", body: form })
}
function connect() {
  return spyOn(globalThis, "fetch").mockImplementation((async (input: URL | RequestInfo, init?: RequestInit) => {
    const req = new Request(new URL(String(input), "http://localhost:3000"), init)
    const pathname = new URL(req.url).pathname
    if (pathname === "/api/library/content") return req.method === "POST" ? upload(req) : list(req)
    const id = decodeURIComponent(pathname.split("/").at(-1)!)
    return req.method === "DELETE" ? remove(req, context(id)) : download(req, context(id))
  }) as typeof globalThis.fetch)
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "trailer-content-test-"))
  process.env.TRAILER_LIBRARY_DIR = directory
  delete process.env.TRAILER_AUDIO_LIBRARY_DIR
  newBrowser()
})

afterEach(async () => {
  mock.restore()
  if (originalRoot === undefined) delete process.env.TRAILER_LIBRARY_DIR
  else process.env.TRAILER_LIBRARY_DIR = originalRoot
  if (originalAudioRoot === undefined) delete process.env.TRAILER_AUDIO_LIBRARY_DIR
  else process.env.TRAILER_AUDIO_LIBRARY_DIR = originalAudioRoot
  if (originalDatabase) Object.defineProperty(globalThis, "indexedDB", originalDatabase)
  else Reflect.deleteProperty(globalThis, "indexedDB")
  await rm(directory, { recursive: true, force: true })
})

test("a generated video is visible and downloadable in a second browser with empty IndexedDB", async () => {
  connect()
  const saved = await saveLibraryItem({ ...base, media: new Blob([video], { type: "video/webm" }) })
  newBrowser()
  const item = (await getLibrarySnapshot()).items.find((item) => item.id === saved.id)!
  expect(item).toBeDefined()
  expect(item.media).toBeUndefined()
  const response = await fetch(item.downloadUrl!)
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="Shared-trailer_video.webm"')
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(video)
  expect(new Uint8Array(await readFile(path.join(directory, "video", base.id, "video.webm")))).toEqual(video)
})

test("posters and scripts are saved beside videos and survive browser storage removal", async () => {
  connect()
  await saveLibraryItem({ ...base, id: "artwork", type: "poster", extension: "png", media: new Blob([poster], { type: "image/png" }) })
  await saveLibraryItem({ ...base, id: "source", type: "script", extension: "txt" })
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined })
  const snapshot = await getLibrarySnapshot()
  expect(snapshot.archiveAvailable).toBe(true)
  expect(snapshot.items).toHaveLength(2)
  expect(new Uint8Array(await readFile(path.join(directory, "poster", "artwork", "poster.png")))).toEqual(poster)
  expect(await readFile(path.join(directory, "script", "source", "script.txt"), "utf8")).toBe(base.script)
  expect(new Uint8Array(await (await download(request("artwork"), context("artwork"))).arrayBuffer())).toEqual(poster)
})

test("existing browser videos, posters and scripts migrate once without resurrecting deleted assets", async () => {
  const offline = spyOn(globalThis, "fetch").mockResolvedValue(new Response("Offline", { status: 503 }))
  expect(await archiveGeneratedContent({ ...base, media: new Blob([video]) })).toBe(false)
  expect(await archiveGeneratedContent({ ...base, id: "poster", type: "poster", extension: "png", media: new Blob([poster]) })).toBe(false)
  expect(await archiveGeneratedContent({ ...base, id: "script", type: "script", extension: "txt" })).toBe(false)
  offline.mockRestore()
  connect()
  await importBrowserContent()
  await importBrowserContent()
  expect((await listContentAssets()).items).toHaveLength(3)
  await deleteContentAsset(base.id) // Simulate deletion by a different browser.
  await importBrowserContent()
  expect((await getLibrarySnapshot()).items.map((item) => item.id).sort()).toEqual(["poster", "script"])
  expect((await upload(uploadRequest(base, video))).status).toBe(410)
})

test("HTTP previews support range requests and HEAD without changing the saved bytes", async () => {
  await saveContentAsset(base, video)
  for (const [range, start, end] of [["bytes=2-5", 2, 5], ["bytes=6-", 6, 8], ["bytes=-3", 6, 8], ["bytes=7-99", 7, 8]] as const) {
    const response = await download(request(base.id, { Range: range }), context())
    expect(response.status).toBe(206)
    expect(response.headers.get("content-range")).toBe(`bytes ${start}-${end}/${video.length}`)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(video.slice(start, end + 1))
  }
  const head = await download(new Request(request(), { method: "HEAD" }), context())
  expect(head.headers.get("content-length")).toBe(String(video.length))
  expect((await head.arrayBuffer()).byteLength).toBe(0)
  for (const range of ["bytes=999-", "bytes=5-2", "bytes=-0", "bytes=0-1,3-4"]) {
    const response = await download(request(base.id, { Range: range }), context())
    expect(response.status).toBe(416)
    expect(response.headers.get("content-range")).toBe(`bytes */${video.length}`)
  }
})

test("retries cannot overwrite retained video bytes and concurrent assets are preserved", async () => {
  await Promise.all([saveContentAsset(base, video), saveContentAsset({ ...base, id: "second" }, video)])
  await saveContentAsset(base, new Uint8Array([...video, 99]))
  expect(new Uint8Array(await readFile(path.join(directory, "video", base.id, "video.webm")))).toEqual(video)
  expect((await listContentAssets()).items).toHaveLength(2)
})

test("rejects traversal, mismatched file formats, incompatible extensions and foreign requests", async () => {
  expect((await upload(uploadRequest({ ...base, id: "../outside" }, video))).status).toBe(400)
  expect((await upload(uploadRequest(base, poster))).status).toBe(400)
  expect((await upload(uploadRequest({ ...base, extension: "png" }, poster))).status).toBe(400)
  expect((await download(request("../outside"), context("../outside"))).status).toBe(400)
  expect((await list(new Request("http://localhost:3000/api/library/content", { headers: { Origin: "https://foreign.example" } }))).status).toBe(403)
  expect((await listContentAssets()).items).toHaveLength(0)
})
