import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface KeyStatus {
  present: boolean
  valid: boolean | null
  detail: string
}

export async function GET() {
  const [openrouter, elevenlabs] = await Promise.all([checkOpenRouter(), checkElevenLabs()])
  return NextResponse.json({ openrouter, elevenlabs })
}

async function checkOpenRouter(): Promise<KeyStatus> {
  const key = process.env.OPENROUTER_API?.trim()
  if (!key) return { present: false, valid: null, detail: "OPENROUTER_API not set in .env.local" }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      const label = data?.data?.label
      return { present: true, valid: true, detail: label ? `Key "${label}" accepted` : "Key accepted" }
    }
    if (res.status === 401) return { present: true, valid: false, detail: "Rejected: invalid key" }
    return { present: true, valid: null, detail: `OpenRouter responded ${res.status}` }
  } catch (error) {
    return {
      present: true,
      valid: null,
      detail: error instanceof Error ? error.message : "Validation request failed",
    }
  }
}

async function checkElevenLabs(): Promise<KeyStatus> {
  const key = process.env.ELEVENLABS_API?.trim()
  if (!key) return { present: false, valid: null, detail: "ELEVENLABS_API not set in .env.local" }
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": key },
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      const tier = data?.subscription?.tier
      return { present: true, valid: true, detail: tier ? `Key accepted (${tier} plan)` : "Key accepted" }
    }
    if (res.status === 401) return { present: true, valid: false, detail: "Rejected: invalid key" }
    return { present: true, valid: null, detail: `ElevenLabs responded ${res.status}` }
  } catch (error) {
    return {
      present: true,
      valid: null,
      detail: error instanceof Error ? error.message : "Validation request failed",
    }
  }
}
