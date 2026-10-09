import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { NextRequest } from "next/server"
import { proxy } from "../proxy"
import { createGenerationBudget } from "../lib/server/generation-budget"
import { requireStudioAccess } from "../lib/server/access"
import { POST as chat } from "../app/api/openrouter-chat/route"
import { POST as image } from "../app/api/openrouter-image/route"
import { POST as tts } from "../app/api/elevenlabs-tts/route"
import { GET as keys } from "../app/api/keys-status/route"
import { GET as listContent, POST as uploadContent } from "../app/api/library/content/route"
import { GET as downloadContent, HEAD as headContent, DELETE as deleteContent } from "../app/api/library/content/[id]/route"
import { GET as listAudio, POST as uploadAudio } from "../app/api/library/audio/route"
import { GET as downloadAudio, DELETE as deleteAudio } from "../app/api/library/audio/[id]/route"

const originalPassword = process.env.TRAILER_ACCESS_PASSWORD
const originalNodeEnv = process.env.NODE_ENV
const originalKey = process.env.OPENROUTER_API
const originalFetch = globalThis.fetch
const password = "a-long-studio-password-123456789"
const authorization = `Basic ${Buffer.from(`studio:${password}`).toString("base64")}`
beforeEach(() => { (process.env as Record<string, string | undefined>).NODE_ENV = "production"; process.env.TRAILER_ACCESS_PASSWORD = password })
afterEach(() => {
  for (const [name, value] of [["NODE_ENV", originalNodeEnv], ["TRAILER_ACCESS_PASSWORD", originalPassword], ["OPENROUTER_API", originalKey]]) {
    if (value === undefined) delete process.env[name!]; else process.env[name!] = value
  }
  globalThis.fetch = originalFetch
})
function req(path = "/", method = "GET", authenticated = false) {
  return new Request(`https://studio.example${path}`, { method, headers: { ...(authenticated ? { authorization } : {}), "Content-Type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ messages: [{ role: "user", content: "Write a title" }] }) } : {}) })
}
const context = { params: Promise.resolve({ id: "secret-file" }) }

describe("hosted studio authorization", () => {
  test("production fails closed without a strong configured password", () => {
    delete process.env.TRAILER_ACCESS_PASSWORD
    expect(requireStudioAccess(req())?.status).toBe(503)
    process.env.TRAILER_ACCESS_PASSWORD = "short"
    expect(requireStudioAccess(req())?.status).toBe(503)
  })
  test("local development remains easy; configured passwords apply in development too", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development"
    delete process.env.TRAILER_ACCESS_PASSWORD
    expect(requireStudioAccess(req())).toBeNull()
    process.env.TRAILER_ACCESS_PASSWORD = password
    expect(requireStudioAccess(req())?.status).toBe(401)
  })
  test("requires the studio username and exact password without reflecting credentials", async () => {
    expect(requireStudioAccess(req("/", "GET", true))).toBeNull()
    for (const credentials of ["other:" + password, "studio:wrong", "malformed"]) {
      const response = requireStudioAccess(new Request("https://studio.example", { headers: { authorization: `Basic ${Buffer.from(credentials).toString("base64")}` } }))!
      expect(response.status).toBe(401)
      expect(response.headers.get("www-authenticate")).toContain("Basic")
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(await response.text()).not.toContain(password)
    }
  })
  test("proxy covers pages, assets, downloads, and Next internals", () => {
    for (const path of ["/", "/settings", "/library", "/api/library/content/secret-file?download=1", "/assets/music/file.mp3", "/_next/static/chunks/app.js", "/_next/image?url=secret", "/favicon.ico"]) {
      expect(proxy(new NextRequest(`https://studio.example${path}`)).status).toBe(401)
      expect(proxy(new NextRequest(`https://studio.example${path}`, { headers: { authorization } })).headers.get("cache-control")).toBe("private, no-store")
    }
  })
  test("every API rejects access before providers, parsing, or archive operations", async () => {
    const fetch = mock(async () => { throw new Error("must not call provider") })
    globalThis.fetch = fetch as unknown as typeof globalThis.fetch
    const responses = await Promise.all([
      chat(req("/api/openrouter-chat", "POST")), image(req("/api/openrouter-image", "POST")), tts(req("/api/elevenlabs-tts", "POST")), keys(req("/api/keys-status")),
      listContent(req()), uploadContent(req("/api/library/content", "POST")), downloadContent(req("/api/library/content/secret-file?download=1"), context), headContent(req("/api/library/content/secret-file", "HEAD"), context), deleteContent(req("/api/library/content/secret-file", "DELETE"), context),
      listAudio(req()), uploadAudio(req("/api/library/audio", "POST")), downloadAudio(req(), context), deleteAudio(req("/api/library/audio/secret-file", "DELETE"), context),
    ])
    for (const response of responses) expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  test("does not forward provider errors or secret key details to the browser", async () => {
    process.env.OPENROUTER_API = "sensitive-provider-key"
    globalThis.fetch = mock(async () => Response.json({ error: "sensitive-provider-key /private/host/path" }, { status: 401 })) as unknown as typeof globalThis.fetch
    const response = await chat(req("/api/openrouter-chat", "POST", true))
    expect(response.status).toBe(401)
    expect(await response.text()).not.toContain("sensitive-provider-key")
  })
  test("route handlers share concurrency slots and release them after provider failure", async () => {
    process.env.OPENROUTER_API = "sensitive-provider-key"
    let release: (() => void) | undefined
    const held = new Promise<void>((resolve) => { release = resolve })
    let calls = 0
    globalThis.fetch = mock(async () => { calls++; await held; throw new Error("private failure") }) as unknown as typeof globalThis.fetch
    const first = chat(req("/api/openrouter-chat", "POST", true))
    const second = image(new Request("https://studio.example/api/openrouter-image", { method: "POST", headers: { authorization, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "Poster" }) }))
    // Let both handlers finish validating streamed bodies and acquire slots.
    for (let wait = 0; calls < 2 && wait < 100; wait++) await new Promise((resolve) => setTimeout(resolve, 1))
    expect(calls).toBe(2)
    expect((await chat(req("/api/openrouter-chat", "POST", true))).status).toBe(429)
    release!()
    expect((await first).status).toBe(502)
    expect((await second).status).toBe(502)
    globalThis.fetch = mock(async () => Response.json({ choices: [{ message: { content: "Title" } }] })) as unknown as typeof globalThis.fetch
    expect((await chat(req("/api/openrouter-chat", "POST", true))).status).toBe(200)
  })
  test("bounds chunked generation JSON before contacting a provider", async () => {
    process.env.OPENROUTER_API = "sensitive-provider-key"
    let emitted = 0, cancelled = false
    const fetch = mock(async () => Response.json({}))
    globalThis.fetch = fetch as unknown as typeof globalThis.fetch
    const body = new ReadableStream({ pull(controller) { emitted++; controller.enqueue(new Uint8Array(64 * 1024)) }, cancel() { cancelled = true } })
    const response = await chat(new Request("https://studio.example/api/openrouter-chat", { method: "POST", headers: { authorization, "Content-Type": "application/json" }, body }))
    expect(response.status).toBe(400)
    expect(cancelled).toBe(true)
    expect(emitted).toBeLessThanOrEqual(6)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe("shared generation budget", () => {
  test("atomically limits concurrent work and release is idempotent", () => {
    const budget = createGenerationBudget(10, 1000, 2)
    const first = budget.acquire(1000)!, second = budget.acquire(1000)!
    expect(budget.acquire(1000)).toBeNull()
    first(); first()
    const third = budget.acquire(1000)!
    expect(budget.acquire(1000)).toBeNull()
    second(); third()
    expect(budget.acquire(1000)).not.toBeNull()
  })
  test("counts accepted attempts for the full window even when a provider fails", () => {
    const budget = createGenerationBudget(2, 1000, 2)
    budget.acquire(1000)!(); budget.acquire(1001)!()
    expect(budget.acquire(1999)).toBeNull()
    expect(budget.acquire(2000)).not.toBeNull()
  })
})

describe("bounded archive storage", () => {
  test("concurrent saves cannot race the last available record; deletions preserve tombstones", async () => {
    const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises")
    const { tmpdir } = await import("node:os")
    const path = await import("node:path")
    const { saveContentAsset, deleteContentAsset, listContentAssets, MAX_ARCHIVE_RECORDS } = await import("../lib/server/content-library")
    const directory = await mkdtemp(path.join(tmpdir(), "trailer-budget-test-"))
    const originalRoot = process.env.TRAILER_LIBRARY_DIR, originalAudio = process.env.TRAILER_AUDIO_LIBRARY_DIR
    process.env.TRAILER_LIBRARY_DIR = directory; delete process.env.TRAILER_AUDIO_LIBRARY_DIR
    try {
      await mkdir(path.join(directory, ".deleted"))
      await Promise.all(Array.from({ length: MAX_ARCHIVE_RECORDS - 1 }, (_, n) => writeFile(path.join(directory, ".deleted", `old-${n}`), "deleted")))
      const script = "One chance."
      const item = { id: "last-a", type: "script" as const, title: "Title", script, parameters: {}, createdAt: 1, extension: "txt" as const }
      const bytes = new TextEncoder().encode(script)
      const results = await Promise.allSettled([saveContentAsset(item, bytes), saveContentAsset({ ...item, id: "last-b" }, bytes)])
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult
      expect(rejected.reason.status).toBe(507)
      const [saved] = (await listContentAssets()).items
      // A retry of an already saved generation must work even at the cap.
      expect((await saveContentAsset({ ...item, id: saved.id }, bytes)).id).toBe(saved.id)
      await deleteContentAsset(saved.id)
      expect((await listContentAssets()).items).toHaveLength(0)
      expect((await listContentAssets()).deletedIds).toHaveLength(MAX_ARCHIVE_RECORDS)
      await expect(saveContentAsset({ ...item, id: saved.id }, bytes)).rejects.toMatchObject({ status: 410 })
      await expect(deleteContentAsset("never-saved")).rejects.toMatchObject({ status: 507 })
    } finally {
      if (originalRoot === undefined) delete process.env.TRAILER_LIBRARY_DIR; else process.env.TRAILER_LIBRARY_DIR = originalRoot
      if (originalAudio === undefined) delete process.env.TRAILER_AUDIO_LIBRARY_DIR; else process.env.TRAILER_AUDIO_LIBRARY_DIR = originalAudio
      await rm(directory, { recursive: true, force: true })
    }
  })
  test("counts existing disk bytes before accepting another asset", async () => {
    const { mkdtemp, mkdir, open, rm } = await import("node:fs/promises")
    const { tmpdir } = await import("node:os")
    const path = await import("node:path")
    const { saveContentAsset, MAX_ARCHIVE_BYTES } = await import("../lib/server/content-library")
    const directory = await mkdtemp(path.join(tmpdir(), "trailer-byte-budget-test-"))
    const originalRoot = process.env.TRAILER_LIBRARY_DIR, originalAudio = process.env.TRAILER_AUDIO_LIBRARY_DIR
    process.env.TRAILER_LIBRARY_DIR = directory; delete process.env.TRAILER_AUDIO_LIBRARY_DIR
    try {
      await mkdir(path.join(directory, "video", "existing"), { recursive: true })
      const file = await open(path.join(directory, "video", "existing", "video.mp4"), "w")
      try { await file.truncate(MAX_ARCHIVE_BYTES) } finally { await file.close() }
      await expect(saveContentAsset({ id: "new", type: "script", title: "Title", script: "Text", parameters: {}, createdAt: 1, extension: "txt" }, new TextEncoder().encode("Text"))).rejects.toMatchObject({ status: 507 })
    } finally {
      if (originalRoot === undefined) delete process.env.TRAILER_LIBRARY_DIR; else process.env.TRAILER_LIBRARY_DIR = originalRoot
      if (originalAudio === undefined) delete process.env.TRAILER_AUDIO_LIBRARY_DIR; else process.env.TRAILER_AUDIO_LIBRARY_DIR = originalAudio
      await rm(directory, { recursive: true, force: true })
    }
  })
})
