import { MOVIE_TITLE_SYSTEM_PROMPT, MOVIE_TITLE_USER_PROMPT } from "@/app/movieTitlePrompts"
import { OPENROUTER_SCRIPT_SYSTEM_PROMPT, OPENROUTER_SCRIPT_USER_PROMPT } from "@/app/scriptPrompts"
import { generatePosterPrompt } from "@/app/movieposterPrompts"
import { posterDataSchema, type PosterData, type PosterDataResponse } from "@/lib/poster-schema"
import { loadKeys } from "@/lib/vault"
import { TTS_MODEL_ID, TTS_VOICE_ID, TTS_VOICE_SETTINGS } from "@/lib/elevenlabs-config"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const TEXT_MODEL = "z-ai/glm-5.3-flash"
const IMAGE_MODEL = "openai/gpt-image-2.5-flare"
export const ENV_PROXY = "__env__"

export type { PosterData, PosterDataResponse }

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>
}

function extractApiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const detail = (data as Record<string, unknown>).detail
    if (typeof detail === "string") return detail
    if (detail && typeof detail === "object") {
      const { message, status } = detail as Record<string, unknown>
      if (typeof message === "string") return message
      if (typeof status === "string") return status
      return JSON.stringify(detail)
    }
  }
  return fallback
}

interface OpenRouterImage {
  data?: Array<{ b64_json?: string; media_type?: string }>
}

export class ApiClient {
  constructor(
    private openRouterKey: string,
    private elevenLabsKey: string,
  ) {}

  getOpenRouterKey(): string {
    return this.openRouterKey
  }

  private referer(): string {
    return typeof window !== "undefined" && window.location
      ? window.location.origin
      : "http://localhost"
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.referer(),
      "X-Title": "Movie Trailer Generator",
    }
  }

  private async openRouterText(
    messages: Array<{ role: string; content: string }>,
    max_tokens: number,
  ): Promise<string> {
    if (this.openRouterKey === ENV_PROXY) return this.openRouterTextViaEnv(messages, max_tokens)
    if (!this.openRouterKey) throw new Error("OpenRouter API key is required")
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages,
          max_tokens,
          temperature: 0.5,
          reasoning: { effort: "low" },
        }),
      })

      if (response.ok) {
        const data: OpenRouterResponse = await response.json()
        return data.choices[0]?.message?.content?.trim() ?? ""
      }

      const errorData = await response.json().catch(() => ({}))
      const raw = errorData.error?.metadata?.raw
      const provider = errorData.error?.metadata?.provider_name
      const detail = raw
        ? `${raw}${provider ? ` (provider: ${provider})` : ""}`
        : errorData.error?.message
      lastError = new Error(`OpenRouter API error: ${response.status} - ${detail || "Unknown error"}`)
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 4000)))
        continue
      }
      throw lastError
    }

    throw lastError ?? new Error("OpenRouter API request failed")
  }

  private async openRouterTextViaEnv(
    messages: Array<{ role: string; content: string }>,
    max_tokens: number,
  ): Promise<string> {
    const response = await fetch("/api/openrouter-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, max_tokens }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} - ${data.error?.message || "Unknown error"}`)
    }
    return (typeof data.content === "string" ? data.content : "").trim()
  }

  async generateMovieTitle(parameters: {
    genre: string
    setting: string
    character: string
    conflict: string
    plotTwist: string
  }): Promise<string> {
    const prompt = MOVIE_TITLE_USER_PROMPT
      .replace("{genre}", parameters.genre)
      .replace("{main_character}", parameters.character)
      .replace("{setting}", parameters.setting)
      .replace("{conflict}", parameters.conflict)
      .replace("{plot_twist}", parameters.plotTwist)
    return (
      (await this.openRouterText(
        [
          { role: "system", content: MOVIE_TITLE_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        50,
      )) || "Untitled Movie"
    )
  }

  async generateScript(
    parameters: {
      genre: string
      setting: string
      character: string
      conflict: string
      plotTwist: string
    },
    title: string,
  ): Promise<string> {
    const prompt = OPENROUTER_SCRIPT_USER_PROMPT
      .replace("{title}", title)
      .replace("{genre}", parameters.genre)
      .replace("{setting}", parameters.setting)
      .replace("{character}", parameters.character)
      .replace("{conflict}", parameters.conflict)
      .replace("{plot_twist}", parameters.plotTwist)
    return (
      (await this.openRouterText(
        [
          { role: "system", content: OPENROUTER_SCRIPT_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        450,
      )) || "Failed to generate script"

    )
  }

  async generateVoiceover(text: string): Promise<ArrayBuffer> {
    if (this.elevenLabsKey === ENV_PROXY) {
      const response = await fetch("/api/elevenlabs-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `ElevenLabs API error: ${response.status} - ${extractApiError(errorData, "Unknown error")}`,
        )
      }
      return await response.arrayBuffer()
    }
    if (!this.elevenLabsKey) throw new Error("ElevenLabs API key is required")
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL_ID,
        voice_settings: TTS_VOICE_SETTINGS,
      }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${extractApiError(errorData, "Unknown error")}`,
      )
    }
    return await response.arrayBuffer()
  }

  async generatePosterData(params: {
    title: string
    genre: string
    mainCharacter: string
    setting: string
    conflict: string
    plotTwist: string
    script: string
  }): Promise<PosterDataResponse> {
    const { systemPrompt, userPrompt } = generatePosterPrompt(params)
    try {
      const content = await this.openRouterText(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        4000,
      )
      if (!content) throw new Error("Invalid response format from OpenRouter API")
      const parsed = JSON.parse(stripCodeFences(content))
      const validated = posterDataSchema.safeParse(parsed)
      if (!validated.success) {
        throw new Error(
          `Poster data did not match the expected format: ${validated.error.issues[0]?.message ?? "unknown issue"}`,
        )
      }
      return { success: true, data: validated.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  async generatePosterImage(posterData: PosterData, title?: string): Promise<string> {
    const posterTitle = (title ?? posterData.typography.additionalText?.[0] ?? "").trim()
    if (this.openRouterKey !== ENV_PROXY && !this.openRouterKey) {
      throw new Error("OpenRouter API key is required")
    }
    const isEnv = this.openRouterKey === ENV_PROXY
    const response = isEnv
      ? await fetch("/api/openrouter-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: buildPosterImagePrompt(posterData, title),
            aspect_ratio: "2:3",
          }),
        })
      : await fetch(`${OPENROUTER_BASE_URL}/images`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            model: IMAGE_MODEL,
            prompt: buildPosterImagePrompt(posterData, title),
            aspect_ratio: "2:3",
            n: 1,
          }),
        })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment before trying again.")
      }
      throw new Error(
        `OpenRouter image API error: ${response.status} - ${errorData.error?.metadata?.raw || errorData.error?.message || "Unknown error"}`,
      )
    }

    const data: OpenRouterImage = await response.json()
    const image = data.data?.[0]
    if (!image?.b64_json) {
      throw new Error("Failed to generate image: no image data in response")
    }
    return `data:${image.media_type || "image/png"};base64,${image.b64_json}`
  }
}

function stripCodeFences(content: string): string {
  if (content.startsWith("```json")) return content.substring(7, content.length - 3).trim()
  if (content.startsWith("```")) return content.substring(3, content.length - 3).trim()
  return content
}

function buildPosterImagePrompt(posterData: PosterData, title?: string): string {
  const { visualStyle, composition, subject, environment, typography, effects } = posterData
  const posterTitle = (title ?? typography.additionalText?.[0] ?? "").trim()
  return `Create a 2:3 portrait one-sheet movie poster for a theatrical release of "${posterTitle}".

Scene:
${environment.setting}${environment.timeOfDay ? `, ${environment.timeOfDay}` : ""}${environment.weather ? `, ${environment.weather} weather` : ""}. Atmosphere: ${environment.atmosphere}.

Subject:
${subject.mainSubject}, ${subject.pose}. The subject is ${subject.scale} in the frame.${subject.secondaryElements?.length ? ` Secondary elements: ${subject.secondaryElements.join(", ")}.` : ""}

Composition:
${composition.perspective} camera. ${composition.layout}; focal point is ${composition.focusPoint}. Depth treatment: ${composition.depth}.

Visual treatment:
${visualStyle.style} style with a ${visualStyle.mood} mood. Palette: ${visualStyle.colorPalette.join(", ")}. Lighting: ${visualStyle.lighting}. Cinematic key-art quality suitable for print.

Details:
${effects.specialEffects?.length ? `Visual effects: ${effects.specialEffects.join(", ")}. ` : ""}${effects.textureOverlay ? `Texture: ${effects.textureOverlay}. ` : ""}${effects.gradients?.length ? `Gradients: ${effects.gradients.join(", ")}.` : ""}

Text:
Set the exact title "${posterTitle}" as the main headline — ${typography.titleStyle}, ${typography.fontStyle}, placed ${typography.titlePlacement}.${typography.additionalText?.length ? ` Additional text: ${typography.additionalText.join(", ")}.` : ""}
Keep all wording fully legible. No other text.

Constraints:
Vertical 2:3 aspect ratio. Follow professional cinematic poster conventions with clear visual hierarchy. No watermark, no logos, no borders or frames, no extra people, no deformed anatomy.`
}

export async function getApiClientAsync(): Promise<ApiClient | null> {
  if (typeof window === "undefined") return null
  const keys = await loadKeys()
  return new ApiClient(keys.openrouter ?? ENV_PROXY, keys.elevenlabs ?? ENV_PROXY)
}

export async function generatePosterData(params: {
  title: string
  genre: string
  mainCharacter: string
  setting: string
  conflict: string
  plotTwist: string
  script: string
}): Promise<PosterDataResponse> {
  const apiClient = await getApiClientAsync()
  if (!apiClient) {
    return {
      success: false,
      error: "API client not initialized. Add your OpenRouter and ElevenLabs keys in Settings.",
    }
  }
  return apiClient.generatePosterData(params)
}

export async function generateMoviePoster(
  posterData: PosterData,
  title?: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const apiClient = await getApiClientAsync()
    if (!apiClient) {
      throw new Error("API client not initialized. Add your OpenRouter and ElevenLabs keys in Settings.")
    }
    const url = await apiClient.generatePosterImage(posterData, title)
    return { success: true, url }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
