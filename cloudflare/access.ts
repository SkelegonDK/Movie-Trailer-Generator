export function error(message: string, status = 400) {
  return Response.json({ error: { message }, detail: message }, { status, headers: { "Cache-Control": "private, no-store" } })
}
export async function authorize(request: Request, password?: string) {
  if (!password || password.length < 20) return error("Configure a strong TRAILER_ACCESS_PASSWORD before hosting", 503)
  const url = new URL(request.url)
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return error("HTTPS is required", 403)
  const header = request.headers.get("authorization") || ""
  let supplied = ""
  try { if (header.startsWith("Basic ")) supplied = atob(header.slice(6)) } catch {}
  // Hash both strings before comparison: avoid early exits on password prefixes.
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))
  const [expected, actual] = await Promise.all([digest(`studio:${password}`), digest(supplied)])
  let difference = 0
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ actual[i]
  if (difference) return new Response("Sign in with username studio", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Trailer Studio", charset="UTF-8"', "Cache-Control": "private, no-store" } })
  if (request.headers.get("sec-fetch-site") === "cross-site" || (request.headers.has("origin") && request.headers.get("origin") !== url.origin)) return error("Cross-origin requests are not allowed", 403)
  return null
}
