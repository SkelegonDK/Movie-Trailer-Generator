import { libraryAssetSchema } from "@/lib/library-schema"
import { ArchiveError, listContentAssets, MAX_ASSET_BYTES, saveContentAsset } from "@/lib/server/content-library"
import { readMediaUpload } from "../../_shared/media-upload"
import { requestError, validateSameOriginRequest } from "../../_shared/request"

export const runtime = "nodejs"
const headers = { "Cache-Control": "private, no-store" }

export async function GET(req: Request) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  try { return Response.json(await listContentAssets(), { headers }) }
  catch { return requestError("The asset archive is unavailable", 503) }
}
export async function POST(req: Request) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return requestError("A multipart file upload is required", 415)
  try {
    const form = await readMediaUpload(req, MAX_ASSET_BYTES.video)
    const raw = form.get("metadata")
    const parsed = libraryAssetSchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : null)
    const file = form.get("media")
    if (!parsed.success || !(file instanceof Blob)) return requestError("Valid metadata and a file are required")
    if (file.size > MAX_ASSET_BYTES[parsed.data.type]) return requestError("The file exceeds the archive size limit", 413)
    return Response.json(await saveContentAsset(parsed.data, new Uint8Array(await file.arrayBuffer())), { status: 201, headers })
  } catch (error) {
    if (error instanceof SyntaxError) return requestError("Valid metadata is required")
    if (error instanceof ArchiveError) return requestError(error.message, error.status)
    return requestError("The file could not be saved to the server archive", 503)
  }
}
