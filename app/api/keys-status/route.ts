import { NextResponse } from "next/server"
import { validateSameOriginRequest } from "../_shared/request"

export const dynamic = "force-dynamic"

interface KeyStatus {
  present: boolean
  valid: boolean | null
  detail: string
}

export async function GET(req: Request) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  const [openrouter, elevenlabs] = await Promise.all([checkOpenRouter(), checkElevenLabs()])
  return NextResponse.json({ openrouter, elevenlabs }, { headers: { "Cache-Control": "private, no-store" } })
}

async function checkOpenRouter(): Promise<KeyStatus> {
  const key = process.env.OPENROUTER_API?.trim()
  if (!key) return { present: false, valid: null, detail: "OPENROUTER_API not set in .env.local" }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) {
      return { present: true, valid: true, detail: "Key accepted" }
    }
    if (res.status === 401) return { present: true, valid: false, detail: "Rejected: invalid key" }
    return { present: true, valid: null, detail: `OpenRouter responded ${res.status}` }
  } catch {
    return {
      present: true,
      valid: null,
      detail: "Validation request failed",
    }
  }
}

async function checkElevenLabs(): Promise<KeyStatus> {
  const key = process.env.ELEVENLABS_API?.trim()
  if (!key) return { present: false, valid: null, detail: "ELEVENLABS_API not set in .env.local" }
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      signal: AbortSignal.timeout(10_000),
      headers: { "xi-api-key": key },
    })
    if (res.ok) {
      return { present: true, valid: true, detail: "Key accepted" }
    }
    if (res.status === 401) return { present: true, valid: false, detail: "Rejected: invalid key" }
    return { present: true, valid: null, detail: `ElevenLabs responded ${res.status}` }
  } catch {
    return {
      present: true,
      valid: null,
      detail: "Validation request failed",
    }
  }
}
