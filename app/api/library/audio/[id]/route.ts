import { AudioArchiveError, deleteAudioAsset, readAudioAsset } from "@/lib/server/audio-library"
import { requestError, validateGenerationRequest, validateSameOriginRequest } from "../../../_shared/request"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: Context) {
  const rejected = validateSameOriginRequest(req)
  if (rejected) return rejected
  try {
    const { id } = await context.params
    return new Response(new Uint8Array(await readAudioAsset(id)), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    })
  } catch (error) {
    return error instanceof AudioArchiveError ? requestError(error.message, error.status) : requestError("Audio could not be opened", 503)
  }
}

export async function DELETE(req: Request, context: Context) {
  const rejected = validateGenerationRequest(req)
  if (rejected) return rejected
  try {
    const { id } = await context.params
    await deleteAudioAsset(id)
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return error instanceof AudioArchiveError ? requestError(error.message, error.status) : requestError("Audio could not be deleted", 503)
  }
}
