import { NextResponse } from "next/server"

export function requestError(message: string, status = 400) {
  return NextResponse.json({ error: { message }, detail: message }, { status })
}

export function validateGenerationRequest(req: Request): NextResponse | null {
  // JSON-only requests cannot be sent by a cross-origin HTML form or simple fetch.
  // These routes spend the local server's API credits, so reject foreign origins too.
  const origin = req.headers.get("origin")
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin !== null && origin !== new URL(req.url).origin)
  ) {
    return requestError("Cross-origin generation requests are not allowed", 403)
  }
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return requestError("Content-Type must be application/json", 415)
  }
  return null
}
