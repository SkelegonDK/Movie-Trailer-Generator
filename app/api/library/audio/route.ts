import { readMediaUpload } from "../../_shared/media-upload"
import { audioAssetSchema } from "@/lib/audio-library-schema"
import { AudioArchiveError, listAudioAssets, MAX_AUDIO_BYTES, saveAudioAsset } from "@/lib/server/audio-library"
import { requestError, validateSameOriginRequest } from "../../_shared/request"

export const runtime = "nodejs"
const headers = { "Cache-Control": "private, no-store" }

export async function GET(req: Request) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  try { return Response.json(await listAudioAssets(), { headers }) }
  catch { return requestError("The audio archive is unavailable", 503) }
}

export async function POST(req: Request) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return requestError("A multipart audio upload is required", 415)
  }
  try {
    const form = await readMediaUpload(req, MAX_AUDIO_BYTES)
    const raw = form.get("metadata")
    const parsed = audioAssetSchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : null)
    const file = form.get("audio")
    if (!parsed.success || !(file instanceof Blob)) return requestError("Valid audio metadata and a WAV file are required")
    if (file.size > MAX_AUDIO_BYTES) return requestError("Audio files must be at most 100 MB", 413)
    const item = await saveAudioAsset(parsed.data, new Uint8Array(await file.arrayBuffer()))
    return Response.json(item, { status: 201, headers })
  } catch (error) {
    if (error instanceof SyntaxError) return requestError("Valid audio metadata is required")
    if (error instanceof AudioArchiveError) return requestError(error.message, error.status)
    return requestError("Audio could not be saved to the server archive", 503)
  }
}
