import { NextResponse } from "next/server"
import { z } from "zod"
import { readGenerationJSON, requestError, validateGenerationRequest } from "../_shared/request"
import { withGenerationBudget } from "../_shared/generation"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const IMAGE_MODEL = "openai/gpt-image-2.5-flare"
const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(30_000),
  aspect_ratio: z.enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"]).default("2:3"),
})

export async function POST(req: Request) {
  const rejected = validateGenerationRequest(req)
  if (rejected) return rejected
  const key = process.env.OPENROUTER_API?.trim()
  if (!key) return requestError("OPENROUTER_API is not configured", 503)

  const parsed = requestSchema.safeParse(await readGenerationJSON(req))
  if (!parsed.success) return requestError("A non-empty prompt and supported aspect_ratio are required")
  const body = parsed.data

  return withGenerationBudget(async (signal) => {
    const res = await fetch(`${OPENROUTER_BASE_URL}/images`, {
      signal,
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
      return requestError("The provider rejected the generation request", res.status >= 500 ? 502 : res.status)
    }

    return NextResponse.json(await res.json(), { headers: { "Cache-Control": "private, no-store" } })
  })
}
