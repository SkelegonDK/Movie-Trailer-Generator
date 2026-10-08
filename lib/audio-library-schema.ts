import { z } from "zod"

// IDs become directory names on the server. Never accept paths or dot segments.
export const audioAssetIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)
export const audioAssetSchema = z.object({
  id: audioAssetIdSchema,
  type: z.literal("audio"),
  title: z.string().trim().min(1).max(1_000),
  script: z.string().max(100_000),
  parameters: z.object({
    genre: z.string().max(5_000).optional(),
    setting: z.string().max(5_000).optional(),
    character: z.string().max(5_000).optional(),
    conflict: z.string().max(5_000).optional(),
    plotTwist: z.string().max(5_000).optional(),
  }),
  mode: z.enum(["custom", "blockbuster", "aaa-game", "stupid"]).optional(),
  createdAt: z.number().finite().nonnegative(),
  extension: z.literal("wav"),
  duration: z.number().finite().nonnegative().optional(),
})

export type AudioAsset = z.infer<typeof audioAssetSchema>
export const audioArchiveSchema = z.object({
  items: z.array(audioAssetSchema),
  deletedIds: z.array(audioAssetIdSchema),
})
