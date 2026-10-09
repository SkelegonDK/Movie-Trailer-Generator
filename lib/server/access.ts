import { createHash, timingSafeEqual } from "node:crypto"

const REALM = 'Basic realm="Trailer Studio", charset="UTF-8"'

/** Shared-studio access: everyone with this password has access to the same archive. */
export function requireStudioAccess(req: Request): Response | null {
  const password = process.env.TRAILER_ACCESS_PASSWORD
  if (!password && process.env.NODE_ENV !== "production") return null
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" }
  if (!password || password.length < 20) {
    return Response.json({ error: { message: "Studio access is not configured" } }, { status: 503, headers })
  }
  const authorization = req.headers.get("authorization") ?? ""
  let credentials = ""
  if (/^Basic [A-Za-z0-9+/]+={0,2}$/i.test(authorization) && authorization.length < 8192) {
    credentials = Buffer.from(authorization.slice(6), "base64").toString("utf8")
  }
  // Hash both credentials so the comparison always has the same byte length.
  const digest = (value: string) => createHash("sha256").update(value).digest()
  if (!timingSafeEqual(digest(credentials), digest(`studio:${password}`))) {
    return Response.json({ error: { message: "Studio sign-in required" } }, {
      status: 401, headers: { ...headers, "WWW-Authenticate": REALM },
    })
  }
  return null
}
