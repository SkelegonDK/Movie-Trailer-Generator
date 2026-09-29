import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { POST as chat } from "../app/api/openrouter-chat/route"
import { POST as image } from "../app/api/openrouter-image/route"
import { POST as tts } from "../app/api/elevenlabs-tts/route"

const originalFetch = globalThis.fetch
const originalOpenRouterKey = process.env.OPENROUTER_API
const originalElevenLabsKey = process.env.ELEVENLABS_API
const fetchMock = mock(async (_input: URL | RequestInfo, _init?: RequestInit) =>
  Response.json({ choices: [{ message: { content: "Title" } }] }),
)

beforeEach(() => {
  process.env.OPENROUTER_API = "server-openrouter-key"
  process.env.ELEVENLABS_API = "server-elevenlabs-key"
  fetchMock.mockClear()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API
  else process.env.OPENROUTER_API = originalOpenRouterKey
  if (originalElevenLabsKey === undefined) delete process.env.ELEVENLABS_API
  else process.env.ELEVENLABS_API = originalElevenLabsKey
})

const routes = [
  { name: "chat", handler: chat, body: { messages: [{ role: "user", content: "Write a title" }] } },
  { name: "image", handler: image, body: { prompt: "A movie poster" } },
  { name: "tts", handler: tts, body: { text: "In a world" } },
]

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

for (const { name, handler, body } of routes) {
  describe(`${name} environment proxy`, () => {
    it("rejects a cross-origin simple request before spending server credits", async () => {
      const response = await handler(request(body, {
        "Content-Type": "text/plain",
        Origin: "https://untrusted.example",
      }))
      expect(response.status).toBe(403)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("requires JSON even when Origin is missing", async () => {
      const response = await handler(request(body, { "Content-Type": "text/plain" }))
      expect(response.status).toBe(415)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("rejects cross-site fetch metadata even when Origin is missing", async () => {
      const response = await handler(request(body, { "Sec-Fetch-Site": "cross-site" }))
      expect(response.status).toBe(403)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("allows the application's same-origin JSON request", async () => {
      const response = await handler(request(body, { Origin: "http://localhost:3000" }))
      expect(response.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("rejects malformed JSON with a client error", async () => {
      const response = await handler(new Request("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }))
      expect(response.status).toBe(400)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
}

describe("generation request validation", () => {
  it("sends tagged narration to the requested voice with v4-compatible settings", async () => {
    const text = "[whispering] In a world... [long pause] One hero."
    const response = await tts(request({ text }))
    expect(response.status).toBe(200)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/24SBbCTZyk79Li12qFkf")
    expect((options?.headers as Record<string, string>)["xi-api-key"]).toBe("server-elevenlabs-key")
    expect(JSON.parse(options?.body as string)).toEqual({
      text,
      model_id: "eleven_v4",
      voice_settings: { stability: 0.6, similarity_boost: 0.8 },
    })
  })

  it("rejects non-string narration instead of throwing a TypeError", async () => {
    expect((await tts(request({ text: 42 }))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects non-string and blank poster prompts", async () => {
    expect((await image(request({ prompt: {} }))).status).toBe(400)
    expect((await image(request({ prompt: "  " }))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects malformed chat messages and excessive token budgets", async () => {
    expect((await chat(request({ messages: [null] }))).status).toBe(400)
    expect((await chat(request({ ...routes[0].body, max_tokens: 100_000 }))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
