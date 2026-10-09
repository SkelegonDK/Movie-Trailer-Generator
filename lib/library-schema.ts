import { z } from "zod"
import { audioAssetIdSchema, audioAssetSchema } from "./audio-library-schema"

export const libraryAssetSchema = audioAssetSchema.omit({ type: true, extension: true }).extend({
  type: z.enum(["script", "audio", "poster", "video"]),
  extension: z.enum(["txt", "wav", "mp4", "webm", "png", "jpg", "jpeg", "webp", "gif", "avif"]),
}).superRefine((item, ctx) => {
  const extensions = { script: ["txt"], audio: ["wav"], video: ["mp4", "webm"], poster: ["png", "jpg", "jpeg", "webp", "gif", "avif"] }
  if (!extensions[item.type].includes(item.extension)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "File extension does not match the content type" })
})
export type LibraryAsset = z.infer<typeof libraryAssetSchema>
export type AssetType = LibraryAsset["type"]
export const libraryArchiveSchema = z.object({ items: z.array(libraryAssetSchema), deletedIds: z.array(audioAssetIdSchema) })
