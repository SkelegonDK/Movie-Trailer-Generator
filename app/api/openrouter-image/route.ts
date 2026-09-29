import { NextResponse } from "next/server"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const IMAGE_MODEL = "openai/gpt-image-2.5-flare"

export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API?.trim()
  if (!key) {
    return NextResponse.json(
      { error: { message: "OPENROUTER_API is not set in .env.local" } },
      { status: 500 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    prompt?: string
    aspect_ratio?: string
  } | null

  if (!body?.prompt) {
    return NextResponse.json({ error: { message: "prompt is required" } }, { status: 400 })
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": req.headers.get("referer") ?? "http://localhost",
      "X-Title": "Stupid Trailer Generator",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: body.prompt,
      aspect_ratio: body.aspect_ratio ?? "2:3",
      n: 1,
    }),
  })

  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
  }

  return NextResponse.json(await res.json())
}
