import { NextResponse } from "next/server"
import { z } from "zod"
import { TTS_MODEL_ID, TTS_VOICE_ID, TTS_VOICE_SETTINGS } from "@/lib/elevenlabs-config"
import { readGenerationJSON, requestError, validateGenerationRequest } from "../_shared/request"
import { withGenerationBudget } from "../_shared/generation"

const requestSchema = z.object({ text: z.string().trim().min(1).max(10_000) })

export async function POST(req: Request) {
  const rejected = validateGenerationRequest(req)
  if (rejected) return rejected
  const key = process.env.ELEVENLABS_API?.trim()
  if (!key) return requestError("ELEVENLABS_API is not configured", 503)

  const parsed = requestSchema.safeParse(await readGenerationJSON(req))
  if (!parsed.success) return requestError("text must contain 1–10,000 characters")
  const body = parsed.data

  return withGenerationBudget(async (signal) => {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`, {
      signal,
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        model_id: TTS_MODEL_ID,
        voice_settings: TTS_VOICE_SETTINGS,
      }),
    })

    if (!res.ok) {
      return requestError("The provider rejected the generation request", res.status >= 500 ? 502 : res.status)
    }

    return new NextResponse(new Uint8Array(await res.arrayBuffer()), {
      status: 200,
      headers: { "Content-Type": res.headers.get("content-type") ?? "audio/mpeg", "Cache-Control": "private, no-store" },
    })
  })
}
