import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test"
import {
  ApiClient,
  ENV_PROXY,
  generateMoviePoster,
  generatePosterData,
  type PosterData,
} from "../lib/api-client"

import * as vault from "../lib/vault"

const createMockResponse = (data: any, ok = true, status = 200, statusText = "OK"): Response => {
  return {
    ok,
    json: () => Promise.resolve(data),
    arrayBuffer: () => Promise.resolve(data instanceof ArrayBuffer ? data : new ArrayBuffer(8)),
    headers: new Headers(),
    status,
    statusText,
    type: "basic" as ResponseType,
    url: "https://api.example.com",
    redirected: false,
    body: null,
    bodyUsed: false,
    clone: () => createMockResponse(data, ok, status, statusText),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)),
  } as Response
}

const mockFetch = mock((_input: URL | RequestInfo, _init?: RequestInit) =>
  Promise.resolve(createMockResponse({ choices: [{ message: { content: "default mock" } }] })),
)

const originalFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
let loadKeysSpy: ReturnType<typeof spyOn<typeof vault, "loadKeys">>

beforeEach(() => {
  loadKeysSpy = spyOn(vault, "loadKeys").mockResolvedValue({
    openrouter: "test-openrouter-key",
    elevenlabs: "test-elevenlabs-key",
  })
})

afterEach(() => {
  loadKeysSpy.mockRestore()
  globalThis.fetch = originalFetch
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
  else Reflect.deleteProperty(globalThis, "window")
})

const fullMockPosterSpec: PosterData = {
  visualStyle: {
    style: "cinematic",
    colorPalette: ["#FF0000", "#00FF00"],
    mood: "intense",
    lighting: "dramatic",
  },
  composition: { layout: "dynamic", focusPoint: "main character", perspective: "low angle", depth: "deep" },
  subject: { mainSubject: "Robot on Mars", pose: "action", scale: "large" },
  environment: { setting: "Mars surface", atmosphere: "dusty" },
  typography: { titleStyle: "bold", titlePlacement: "top", fontStyle: "sans-serif" },
  effects: { specialEffects: ["glow"] },
}

const posterParams = {
  title: "Test Movie",
  genre: "Sci-Fi",
  mainCharacter: "Robot",
  setting: "Mars",
  conflict: "Survival",
  plotTwist: "Humans are robots",
  script: "A short script.",
}

describe("ApiClient", () => {
  const openRouterKey = "test-openrouter-key"
  const elevenLabsKey = "test-elevenlabs-key"
  let apiClient: ApiClient

  beforeEach(() => {
    mockFetch.mockClear()
    globalThis.fetch = mockFetch as unknown as typeof fetch
    // @ts-expect-error - minimal shape for referer in tests
    globalThis.window = { location: { origin: "http://test.localhost" } }
    apiClient = new ApiClient(openRouterKey, elevenLabsKey)
  })

  describe("text generation", () => {
    it("generates a movie title with the GLM text model", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ choices: [{ message: { content: "Mocked Movie Title" } }] }),
      )
      const title = await apiClient.generateMovieTitle({
        genre: "Action",
        setting: "Space Station",
        character: "Rogue AI",
        conflict: "Power struggle",
        plotTwist: "AI is the hero",
      })
      expect(title).toBe("Mocked Movie Title")
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.model).toBe("z-ai/glm-5.3-flash")
      expect(body.reasoning).toEqual({ effort: "low" })
      expect(body.messages[0].role).toBe("system")
      expect(body.messages[1].role).toBe("user")
      expect(body.messages[1].content).toContain("Action")
    })

    it("generates a movie script", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ choices: [{ message: { content: "Mocked Script Content" } }] }),
      )
      const script = await apiClient.generateScript(
        {
          genre: "Drama",
          setting: "Paris",
          character: "Chef",
          conflict: "Lost recipe",
          plotTwist: "Recipe is a forgery",
        },
        "The Last Recipe",
      )
      expect(script).toBe("Mocked Script Content")
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.model).toBe("z-ai/glm-5.3-flash")
      expect(body.reasoning).toEqual({ effort: "low" })
      expect(body.messages[1].content).toContain("The Last Recipe")
    })

    it("generates a voiceover via ElevenLabs", async () => {
      const audio = new ArrayBuffer(16)
      const text = "[whispering] Hello world. [long pause] Coming soon."
      mockFetch.mockResolvedValueOnce(createMockResponse(audio))
      const result = await apiClient.generateVoiceover(text)
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result.byteLength).toBe(16)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/24SBbCTZyk79Li12qFkf")
      expect((options?.headers as Record<string, string>)["xi-api-key"]).toBe(elevenLabsKey)
      expect(JSON.parse(options?.body as string)).toEqual({
        text,
        model_id: "eleven_v4",
        voice_settings: { stability: 0.6, similarity_boost: 0.8 },
      })
    })

    it("preserves v4 audio tags when using the environment proxy", async () => {
      const text = "[low, gravelly voice] One hero. [short pause] One chance."
      mockFetch.mockResolvedValueOnce(createMockResponse(new ArrayBuffer(16)))
      await new ApiClient(openRouterKey, ENV_PROXY).generateVoiceover(text)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/elevenlabs-tts")
      expect(JSON.parse(options?.body as string)).toEqual({ text })
    })

    it("surfaces ElevenLabs object detail on 401 instead of [object Object]", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { detail: { status: "invalid_api_key", message: "Invalid API key" } },
        false,
        401,
      ))
      await expect(apiClient.generateVoiceover("Hello world")).rejects.toThrow(
        "ElevenLabs API error: 401 - Invalid API key",
      )
    })
  })

  describe("generatePosterData", () => {
    it("generates and validates poster data", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ choices: [{ message: { content: JSON.stringify(fullMockPosterSpec) } }] }),
      )
      const result = await apiClient.generatePosterData(posterParams)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(fullMockPosterSpec)
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.model).toBe("z-ai/glm-5.3-flash")
      expect(body.reasoning).toEqual({ effort: "low" })
      expect(body.messages[0].role).toBe("system")
    })

    it("strips markdown code fences from the JSON response", async () => {
      const rawContent = "```json\n" + JSON.stringify(fullMockPosterSpec) + "\n```"
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ choices: [{ message: { content: rawContent } }] }),
      )
      const result = await apiClient.generatePosterData(posterParams)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(fullMockPosterSpec)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://openrouter.ai/api/v1/chat/completions")
      const body = JSON.parse(options?.body as string)
      expect(body.model).toBe("z-ai/glm-5.3-flash")
      expect(body.reasoning).toEqual({ effort: "low" })
      expect((options?.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${openRouterKey}`)
    })

    it("rejects JSON that does not match the poster schema", async () => {
      const wrongShape = { style: "noir", mainFocus: "detective", lighting: "low key" }
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ choices: [{ message: { content: JSON.stringify(wrongShape) } }] }),
      )
      const result = await apiClient.generatePosterData(posterParams)
      expect(result.success).toBe(false)
      expect(result.error).toContain("did not match the expected format")
    })

    it("returns an error for unparseable JSON", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ choices: [{ message: { content: "this is not json" } }] }),
      )
      const result = await apiClient.generatePosterData(posterParams)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it("maps API errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: { message: "API limit reached" } }, false, 500),
      )
      const result = await apiClient.generatePosterData(posterParams)
      expect(result.success).toBe(false)
      expect(result.error).toContain("OpenRouter API error: 500")
    })
  })

  describe("generatePosterImage", () => {
    it("returns a data URL from the OpenRouter image API", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: [{ b64_json: "aGVsbG8=", media_type: "image/png" }] }),
      )
      const url = await apiClient.generatePosterImage(fullMockPosterSpec)
      expect(url).toBe("data:image/png;base64,aGVsbG8=")
      const [urlArg, options] = mockFetch.mock.calls[0]
      expect(urlArg).toBe("https://openrouter.ai/api/v1/images")
      expect(options?.method).toBe("POST")
      const body = JSON.parse(options?.body as string)
      expect(body.model).toBe("openai/gpt-image-2.5-flare")
      expect(body.aspect_ratio).toBe("2:3")
      expect(body.n).toBe(1)
      expect(body.prompt).toContain("movie poster")
    })

    it("requires an OpenRouter key", async () => {
      const keyless = new ApiClient("", elevenLabsKey)
      await expect(keyless.generatePosterImage(fullMockPosterSpec)).rejects.toThrow(
        "OpenRouter API key is required",
      )
    })

    it("maps rate-limit errors", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 429))
      await expect(apiClient.generatePosterImage(fullMockPosterSpec)).rejects.toThrow(
        "Rate limit exceeded",
      )
    })

    it("maps auth errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: { message: "bad key" } }, false, 401),
      )
      await expect(apiClient.generatePosterImage(fullMockPosterSpec)).rejects.toThrow(
        "OpenRouter image API error: 401",
      )
    })

    it("errors when no image data is returned", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }))
      await expect(apiClient.generatePosterImage(fullMockPosterSpec)).rejects.toThrow(
        "no image data in response",
      )
    })
  })
})

describe("module-level helpers", () => {
  beforeEach(() => {
    mockFetch.mockClear()
    globalThis.fetch = mockFetch as unknown as typeof fetch
    // @ts-expect-error - minimal shape for referer in tests
    globalThis.window = { location: { origin: "http://test.localhost" } }
  })

  it("generatePosterData falls back to the server env proxy when no keys are stored", async () => {
    loadKeysSpy.mockResolvedValueOnce({})
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ content: JSON.stringify(fullMockPosterSpec) }),
    )
    const result = await generatePosterData(posterParams)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(fullMockPosterSpec)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe("/api/openrouter-chat")
  })

  it("generateMoviePoster returns a success result", async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ data: [{ b64_json: "aW1hZ2U=", media_type: "image/png" }] }),
    )
    const result = await generateMoviePoster(fullMockPosterSpec)
    expect(result.success).toBe(true)
    expect(result.url).toBe("data:image/png;base64,aW1hZ2U=")
  })

  it("generateMoviePoster maps errors", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))
    const result = await generateMoviePoster(fullMockPosterSpec)
    expect(result.success).toBe(false)
    expect(result.error).toContain("500")
  })
})
