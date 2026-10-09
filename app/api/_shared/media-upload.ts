import { ArchiveError } from "@/lib/server/content-library"

export async function readMediaUpload(req: Request, maxBytes: number) {
  const reader = req.body?.getReader()
  if (!reader) throw new ArchiveError("A file and metadata are required", 400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes + 256 * 1024) {
        await reader.cancel()
        throw new ArchiveError("The file exceeds the archive size limit", 413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
  try { return await new Response(body, { headers: { "Content-Type": req.headers.get("content-type")! } }).formData() }
  catch { throw new ArchiveError("Invalid file upload", 400) }
}
