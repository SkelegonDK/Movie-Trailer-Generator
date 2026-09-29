import { NextResponse } from "next/server"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const TEXT_MODEL = "z-ai/glm-5.3-flash"

export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API?.trim()
  if (!key) {
    return NextResponse.json(
      { error: { message: "OPENROUTER_API is not set in .env.local" } },
      { status: 500 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    messages?: Array<{ role: string; content: string }>
    max_tokens?: number
  } | null

  if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: { message: "messages array is required" } }, { status: 400 })
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": req.headers.get("referer") ?? "http://localhost",
      "X-Title": "Stupid Trailer Generator",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: body.messages,
      max_tokens: body.max_tokens ?? 500,
      temperature: 0.5,
      reasoning: { effort: "low" },
    }),
  })

  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ content: data.choices?.[0]?.message?.content ?? "" })
}
