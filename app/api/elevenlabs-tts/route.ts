import { NextResponse } from "next/server"
import { z } from "zod"
import { TTS_MODEL_ID, TTS_VOICE_ID, TTS_VOICE_SETTINGS } from "@/lib/elevenlabs-config"
import { requestError, validateGenerationRequest } from "../_shared/request"

const requestSchema = z.object({ text: z.string().trim().min(1).max(10_000) })

export async function POST(req: Request) {
  const rejected = validateGenerationRequest(req)
  if (rejected) return rejected
  const key = process.env.ELEVENLABS_API?.trim()
  if (!key) {
    return NextResponse.json(
      { detail: "ELEVENLABS_API is not set in .env.local" },
      { status: 500 },
    )
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return requestError("text must contain 1–10,000 characters")
  const body = parsed.data

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`, {
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
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
  }

  return new NextResponse(new Uint8Array(await res.arrayBuffer()), {
    status: 200,
    headers: { "Content-Type": res.headers.get("content-type") ?? "audio/mpeg" },
  })
}
