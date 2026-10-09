import { createReadStream } from "node:fs"
import { Readable } from "node:stream"
import { ArchiveError, deleteContentAsset, getContentFile } from "@/lib/server/content-library"
import { requestError, validateGenerationRequest, validateSameOriginRequest } from "../../../_shared/request"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }
const MIME = { txt: "text/plain;charset=utf-8", wav: "audio/wav", mp4: "video/mp4", webm: "video/webm", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif" }

async function serve(req: Request, context: Context) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  try {
    const { item, filePath, size } = await getContentFile((await context.params).id)
    const headers = new Headers({ "Content-Type": MIME[item.extension], "Cache-Control": "private, no-store", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" })
    if (new URL(req.url).searchParams.get("download") === "1") {
      const title = item.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "untitled-trailer"
      headers.set("Content-Disposition", `attachment; filename="${title}_${item.type}.${item.extension}"`)
    }
    let start = 0, end = size - 1
    const range = req.headers.get("range")
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (match && (match[1] || match[2])) {
        if (!match[1]) start = Math.max(0, size - Number(match[2]))
        else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])) }
      } else start = size
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size || (match?.[1] === "" && Number(match[2]) === 0)) {
        headers.set("Content-Range", `bytes */${size}`)
        return new Response(null, { status: 416, headers })
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${size}`)
    }
    headers.set("Content-Length", String(Math.max(0, end - start + 1)))
    // Node and DOM declare different stream types for the same Web Streams API.
    const body = req.method === "HEAD" || size === 0 ? null : Readable.toWeb(createReadStream(/* turbopackIgnore: true */ filePath, { start, end })) as unknown as ReadableStream<Uint8Array>
    return new Response(body, { status: range ? 206 : 200, headers })
  } catch (error) {
    return error instanceof ArchiveError ? requestError(error.message, error.status) : requestError("The file could not be opened", 503)
  }
}
export const GET = serve
export const HEAD = serve
export async function DELETE(req: Request, context: Context) {
  const rejected = validateGenerationRequest(req)
  if (rejected) return rejected
  try {
    await deleteContentAsset((await context.params).id)
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return error instanceof ArchiveError ? requestError(error.message, error.status) : requestError("The file could not be deleted", 503)
  }
}
