import type { ExecutionContext } from "@cloudflare/workers-types"
import app from "vinext/server/app-router-entry"
import type { CloudflareEnv } from "./types"
import { authorize, error } from "./access"
export { ArchiveCoordinator } from "./archive"

function privateResponse(response: Response) {
  const headers = new Headers(response.headers)
  headers.set("Cache-Control", "private, no-store")
  headers.set("Vary", [headers.get("Vary"), "Authorization"].filter(Boolean).join(", "))
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("Referrer-Policy", "same-origin")
  headers.set("X-Frame-Options", "DENY")
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    if (Object.keys(env).some(key => /^(OPENROUTER_|ELEVENLABS_)/.test(key))) return error("Hosted provider keys are disabled; use browser Settings", 503)
    if (!env.TRAILER_PUBLIC_ORIGIN) return error("Configure TRAILER_PUBLIC_ORIGIN before hosting", 503)
    if (new URL(request.url).origin !== env.TRAILER_PUBLIC_ORIGIN) return error("This request does not match the configured studio origin", 403)
    const rejected = await authorize(request, env.TRAILER_ACCESS_PASSWORD)
    if (rejected) {
      if (rejected.status === 401) {
        const ip = request.headers.get("cf-connecting-ip") || "local"
        const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)))].map(b => b.toString(16).padStart(2, "0")).join("")
        const throttle = await env.ARCHIVE.get(env.ARCHIVE.idFromName("archive-v1")).fetch(new Request(`https://internal/auth/${hash}`, { method: "POST" }) as never)
        if (!throttle.ok) return throttle as unknown as Response
      }
      return rejected
    }
    let pathname: string
    try { pathname = decodeURIComponent(new URL(request.url).pathname).replace(/\/+$/, "") || "/" }
    catch { return error("Invalid URL") }
    if (pathname.includes("//") || pathname.includes("\\") || pathname.split("/").some(segment => segment === "." || segment === "..")) return error("Invalid URL")
    // Route matching must use the same decoded path as the application router.
    if (pathname.startsWith("/api/library/")) {
      const normalized = new URL(request.url); normalized.pathname = pathname
      request = new Request(normalized, request)
    }
    const archive = env.ARCHIVE.get(env.ARCHIVE.idFromName("archive-v1"))
    if (pathname.startsWith("/api/library/")) return privateResponse(await archive.fetch(request as never) as unknown as Response)
    if (["/api/openrouter-chat", "/api/openrouter-image", "/api/elevenlabs-tts"].includes(pathname)) {
      if (request.method !== "POST") return error("Method not allowed", 405)
      // No hosted fallback provider keys: callers must supply their own browser keys.
      const token = crypto.randomUUID()
      const admitted = await archive.fetch(new Request(`https://internal/generation/${token}`, { method: "POST" }) as never)
      if (!admitted.ok) return admitted as unknown as Response
      try { return privateResponse(await app.fetch(request, env as never, ctx)) }
      finally { await archive.fetch(new Request(`https://internal/generation/${token}`, { method: "DELETE" }) as never) }
    }
    return privateResponse(await app.fetch(request, env as never, ctx))
  },
}
