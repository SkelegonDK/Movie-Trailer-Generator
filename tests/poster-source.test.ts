import { afterEach, describe, expect, it } from "bun:test"
import { getPosterSource } from "../lib/poster-source"
import { useStore } from "../lib/store"

const initial = useStore.getState()
afterEach(() => useStore.setState(initial, true))

describe("poster source review", () => {
  it("retains artwork and requires a new decision after story edits", () => {
    const state = useStore.getState()
    state.setCurrentScript("An unlikely hero saves the city.")
    state.setPosterUrl("data:image/png;base64,poster")
    const source = useStore.getState().posterSource
    state.setCurrentScript("A villain destroys the city.")
    expect(useStore.getState().posterUrl).toBe("data:image/png;base64,poster")
    expect(useStore.getState().posterSource).toBe(source)
    expect(getPosterSource(useStore.getState())).not.toBe(source)
    state.acceptPosterReuse()
    expect(useStore.getState().posterReuseSource).toBe(getPosterSource(useStore.getState()))
    state.setMovieTitle("A Different Film")
    expect(useStore.getState().posterReuseSource).not.toBe(getPosterSource(useStore.getState()))
  })

  it("tracks title, fields, mode and script but ignores outer whitespace", () => {
    const state = { ...initial, currentScript: "Narration", movieTitle: "Title" }
    const source = getPosterSource(state)
    expect(getPosterSource({ ...state, currentScript: " Narration\n", movieTitle: " Title " })).toBe(source)
    for (const field of ["genre", "setting", "character", "conflict", "plotTwist"] as const) {
      expect(getPosterSource({ ...state, parameters: { ...state.parameters, [field]: "changed" } })).not.toBe(source)
    }
    expect(getPosterSource({ ...state, mode: "stupid" })).not.toBe(source)
  })

  it("uses the original generation snapshot and resets approval on replacement", () => {
    const state = useStore.getState()
    const source = getPosterSource(state)
    state.setMovieTitle("Edited during generation")
    state.setPosterUrl("first", source)
    expect(useStore.getState().posterSource).toBe(source)
    expect(useStore.getState().posterSource).not.toBe(getPosterSource(useStore.getState()))
    state.acceptPosterReuse()
    state.setPosterUrl("replacement")
    expect(useStore.getState().posterSource).toBe(getPosterSource(useStore.getState()))
    expect(useStore.getState().posterReuseSource).toBeNull()
    state.setPosterUrl(null)
    expect(useStore.getState().posterSource).toBeNull()
  })
})
