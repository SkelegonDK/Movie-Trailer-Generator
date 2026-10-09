import type { MovieParameters, ParameterMode } from "./parameter-modes"

interface PosterInputs {
  movieTitle: string
  parameters: MovieParameters
  currentScript: string
  mode: ParameterMode
}

/** Conservative comparison: any source edit except outer whitespace needs review. */
export function getPosterSource(inputs: PosterInputs): string {
  const fields = ["genre", "setting", "character", "conflict", "plotTwist"] as const
  return JSON.stringify([
    inputs.movieTitle.trim(), inputs.currentScript.trim(), inputs.mode,
    ...fields.map((field) => inputs.parameters[field].trim()),
  ])
}
