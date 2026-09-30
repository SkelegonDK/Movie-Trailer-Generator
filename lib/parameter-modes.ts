import blockbusterParameters from "@/assets/blockbuster-parameters.json"
import aaaGameParameters from "@/assets/aaa-game-parameters.json"
import stupidParameters from "@/assets/stupid-parameters.json"

export interface MovieParameters {
  genre: string
  setting: string
  character: string
  conflict: string
  plotTwist: string
}

type ParameterOptions = { [Field in keyof MovieParameters]: string[] }

export const PARAMETER_MODES = {
  custom: {
    label: "Custom",
    description: "Write your own genre, setting, character, conflict, and plot twist.",
    parameters: null,
    generationContext: "",
  },
  blockbuster: {
    label: "Blockbuster",
    description: "Big-screen genres, dramatic stakes, and familiar movie twists, with room for humor.",
    parameters: blockbusterParameters,
    generationContext: "",
  },
  "aaa-game": {
    label: "AAA Game",
    description: "Epic game worlds, playable heroes, and high-stakes conflicts for a cinematic game reveal.",
    parameters: aaaGameParameters,
    generationContext: "Create a cinematic reveal trailer for an original AAA video game. Give it an evocative game title and dramatic narration that promises a playable adventure, an immersive world, and meaningful stakes. Treat the main character as the playable protagonist. Keep the existing narration format and word-count rules; do not include film-release language, gameplay directions, or invented release dates or platforms.",
  },
  stupid: {
    label: "Stupid",
    description: "Completely absurd and nonsensical ideas for maximum humor.",
    parameters: stupidParameters,
    generationContext: "",
  },
} satisfies Record<string, {
  label: string
  description: string
  parameters: ParameterOptions | null
  generationContext: string
}>

export type ParameterMode = keyof typeof PARAMETER_MODES
export const DEFAULT_PARAMETER_MODE: ParameterMode = "blockbuster"

export function getGenerationContext(mode: ParameterMode, customContext = ""): string {
  return [PARAMETER_MODES[mode].generationContext, customContext.trim()].filter(Boolean).join("\n\n")
}
