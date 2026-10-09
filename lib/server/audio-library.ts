import { readFile } from "node:fs/promises"
import { audioAssetSchema, type AudioAsset } from "../audio-library-schema"
import { deleteContentAsset, getContentFile, listContentAssets, saveContentAsset } from "./content-library"

// Preserve the existing audio routes and on-disk layout.
export { ArchiveError as AudioArchiveError } from "./content-library"
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024
export async function listAudioAssets() { return listContentAssets("audio") }
export async function saveAudioAsset(metadata: AudioAsset, bytes: Uint8Array) {
  return saveContentAsset(audioAssetSchema.parse(metadata), bytes)
}
export async function readAudioAsset(id: string) {
  return readFile(/* turbopackIgnore: true */ (await getContentFile(id, "audio")).filePath)
}
export async function deleteAudioAsset(id: string) { return deleteContentAsset(id, "audio") }
