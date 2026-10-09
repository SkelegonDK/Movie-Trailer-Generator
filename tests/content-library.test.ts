import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { IDBFactory } from "fake-indexeddb"
import { archiveGeneratedContent, deleteLibraryItem, getLibraryItems, importSessionAudio, saveLibraryItem } from "../lib/content-library"
import { useStore } from "../lib/store"
import * as api from "../lib/api-client"

const originalDatabase = Object.getOwnPropertyDescriptor(globalThis, "indexedDB")
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
const originalState = useStore.getState()
const content = { type: "script" as const, title: "The Last Espresso", script: "NARRATOR (V.O.)\nOne cup. One chance.", parameters: { genre: "Comedy" }, mode: "blockbuster" as const }

beforeEach(() => {
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: new IDBFactory() })
  spyOn(globalThis, "fetch").mockImplementation((async (_input: URL | RequestInfo, init?: RequestInit) => {
    if (init?.method === "POST") return Response.json(JSON.parse((init.body as FormData).get("metadata") as string))
    if (init?.method === "DELETE") return new Response(null, { status: 204 })
    return Response.json({ items: [], deletedIds: [] })
  }) as typeof globalThis.fetch)
})

afterEach(() => {
  mock.restore()
  useStore.setState(originalState, true)
  if (originalDatabase) Object.defineProperty(globalThis, "indexedDB", originalDatabase)
  else Reflect.deleteProperty(globalThis, "indexedDB")
  if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage)
  else Reflect.deleteProperty(globalThis, "sessionStorage")
})

describe("content library", () => {
  test("stores script snapshots across database connections and orders newest first", async () => {
    const first = await saveLibraryItem({ ...content, createdAt: 1 })
    const second = await saveLibraryItem({ ...content, title: "The Sequel", createdAt: 2 })
    expect(first.id).not.toBe(second.id)
    expect((await getLibraryItems()).map((item) => item.id)).toEqual([second.id, first.id])
    expect(first.extension).toBe("txt")
  })

  test("stores video bytes independently of the generated object URL", async () => {
    const blob = new Blob(["saved video bytes"], { type: "video/webm" })
    const fetch = spyOn(globalThis, "fetch").mockImplementation((async (input: URL | RequestInfo, init?: RequestInit) => {
      if (input === "blob:temporary") return new Response(blob)
      if (init?.method === "POST") return Response.json(JSON.parse((init.body as FormData).get("metadata") as string))
      return Response.json({ items: [], deletedIds: [] })
    }) as typeof globalThis.fetch)
    await saveLibraryItem({ ...content, type: "video", url: "blob:temporary", extension: "webm", duration: 12 })
    expect(fetch).toHaveBeenCalledWith("blob:temporary")
    const [saved] = await getLibraryItems()
    expect(await saved.media?.text()).toBe("saved video bytes")
    expect(saved.media?.type).toBe("video/webm")
    expect(saved).not.toHaveProperty("url")
    expect(saved.duration).toBe(12)
  })

  test("deletes just the chosen generation and persists that deletion", async () => {
    const first = await saveLibraryItem(content)
    const second = await saveLibraryItem(content)
    await deleteLibraryItem(first.id)
    expect((await getLibraryItems()).map((item) => item.id)).toEqual([second.id])
  })

  test("does not create a media entry if fetching its file fails", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unavailable", { status: 404 }))
    expect(await archiveGeneratedContent({ ...content, type: "poster", url: "https://example.com/missing.png" })).toBe(false)
    expect(await getLibraryItems()).toEqual([])
  })

  test("imports available session audio once and skips expired object URLs", async () => {
    const track = { id: "legacy-audio", title: content.title, script: content.script, parameters: content.parameters, duration: 10, timestamp: new Date(1).toISOString(), backgroundMusicId: "music", url: "blob:available" }
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => JSON.stringify([track, { ...track, id: "expired", url: "blob:expired" }]) } })
    spyOn(globalThis, "fetch").mockImplementation((async (input: URL | RequestInfo, init?: RequestInit) => {
      if (input === "/api/library/content") {
        if (init?.method === "POST") return Response.json(JSON.parse((init.body as FormData).get("metadata") as string))
        return Response.json({ items: [], deletedIds: [] })
      }
      if (input === "blob:available") return new Response(new Blob(["audio bytes"], { type: "audio/wav" }))
      throw new Error("URL expired")
    }) as typeof globalThis.fetch)
    await importSessionAudio()
    await importSessionAudio()
    const items = await getLibraryItems()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(track.id)
    expect(await items[0].media?.text()).toBe("audio bytes")
  })

  test("successful script generation archives the title, parameters, and script", async () => {
    const client = new api.ApiClient("test-key", "")
    spyOn(api, "getApiClientAsync").mockResolvedValue(client)
    spyOn(client, "generateScript").mockResolvedValue(content.script)
    useStore.setState({ movieTitle: content.title, parameters: { ...originalState.parameters, ...content.parameters } })
    expect(await useStore.getState().generateScript(mock(() => {}))).toBe(true)
    const [saved] = await getLibraryItems()
    expect(saved.title).toBe(content.title)
    expect(saved.script).toBe(content.script)
    expect(saved.parameters.genre).toBe("Comedy")
  })

  test("unavailable library storage does not fail a completed generation", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(new Response("Offline", { status: 503 }))
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined })
    const client = new api.ApiClient("test-key", "")
    spyOn(api, "getApiClientAsync").mockResolvedValue(client)
    spyOn(client, "generateScript").mockResolvedValue(content.script)
    useStore.setState({ movieTitle: content.title, parameters: { ...originalState.parameters, ...content.parameters } })
    const toast = mock(() => {})
    expect(await useStore.getState().generateScript(toast)).toBe(true)
    expect(useStore.getState().currentScript).toBe(content.script)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Script wasn't saved to Library" }))
  })
})
