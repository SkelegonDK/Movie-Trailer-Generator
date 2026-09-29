import { NextResponse } from "next/server"
import { z } from "zod"
import { requestError, validateGenerationRequest } from "../_shared/request"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const TEXT_MODEL = "z-ai/glm-5.3-flash"
const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().trim().min(1).max(30_000),
  })).min(1).max(20),
  max_tokens: z.number().int().min(1).max(4_000).default(500),
})

export async function POST(req: Request) {
  const rejected = validateGenerationRequest(req)
  if (rejected) return rejected
  const key = process.env.OPENROUTER_API?.trim()
  if (!key) {
    return NextResponse.json(
      { error: { message: "OPENROUTER_API is not set in .env.local" } },
      { status: 500 },
    )
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return requestError("Valid messages and max_tokens between 1 and 4,000 are required")
  const body = parsed.data

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
