import { z } from "zod"

export const contextDataSchema = z.object({
  genre: z.string().trim().min(1),
  setting: z.string().trim().min(1),
  character: z.string().trim().min(1),
  conflict: z.string().trim().min(1),
  plotTwist: z.string().trim().min(1),
  movieTitle: z.string().trim().min(1),
})

export type ContextData = z.infer<typeof contextDataSchema>

export function parseContextData(content: string): ContextData | null {
  try {
    const json = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const result = contextDataSchema.safeParse(JSON.parse(json))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
