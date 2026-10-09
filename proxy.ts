import { NextResponse, type NextRequest } from "next/server"
import { requireStudioAccess } from "./lib/server/access"

// No matcher: protect pages, API routes, downloads, and public/Next assets alike.
export function proxy(req: NextRequest) {
  const rejected = requireStudioAccess(req)
  if (rejected) return rejected
  const response = NextResponse.next()
  if (process.env.TRAILER_ACCESS_PASSWORD || process.env.NODE_ENV === "production") {
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("Vary", "Authorization")
  }
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "same-origin")
  response.headers.set("X-Frame-Options", "DENY")
  return response
}
