import { NextResponse } from "next/server"
import { requireStudioAccess } from "@/lib/server/access"

export function requestError(message: string, status = 400) {
  return NextResponse.json({ error: { message }, detail: message }, { status, headers: { "Cache-Control": "private, no-store" } })
}

export function validateSameOriginRequest(req: Request): Response | null {
  const access = requireStudioAccess(req)
  if (access) return access
  const origin = req.headers.get("origin")
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin !== null && origin !== new URL(req.url).origin)
  ) {
    return requestError("Cross-origin requests are not allowed", 403)
  }
  return null
}

export function validateGenerationRequest(req: Request): Response | null {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  // JSON-only requests cannot be sent by a cross-origin HTML form or simple fetch.
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return requestError("Content-Type must be application/json", 415)
  }
  return null
}

/** Bound JSON bodies before buffering them, including chunked requests. */
export async function readGenerationJSON(req: Request): Promise<unknown> {
  const reader = req.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 256 * 1024) { await reader.cancel(); return null }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder().decode(bytes)) }
  catch { return null }
}
