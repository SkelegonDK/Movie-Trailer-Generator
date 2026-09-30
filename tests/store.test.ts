import { afterEach, describe, expect, it, mock, spyOn } from "bun:test"
import * as api from "../lib/api-client"
import { useStore } from "../lib/store"

const initialState = useStore.getState()

afterEach(() => {
  mock.restore()
  useStore.setState(initialState, true)
})

describe("generation state", () => {
  it("defaults to Blockbuster", () => {
    expect(useStore.getInitialState().mode).toBe("blockbuster")
  })

  for (const enabled of [true, false]) {
    it(`directs AAA Game titles and scripts as game reveals with custom context enabled: ${enabled}`, async () => {
      const client = new api.ApiClient("test-key", "")
      spyOn(api, "getApiClientAsync").mockResolvedValue(client)
      const title = spyOn(client, "generateMovieTitle").mockResolvedValue("Eclipse Protocol")
      const script = spyOn(client, "generateScript").mockResolvedValue("Enter a world on the edge of collapse.")
      const parameters = { ...initialState.parameters, genre: "Open-World Action RPG" }
      useStore.getState().setMode("aaa-game")
      useStore.setState({ parameters, customContextEnabled: enabled, contextFieldsVisible: true, customContext: "  A co-op adventure with dry humor.  " })

      expect(await useStore.getState().generateScript(mock(() => {}))).toBe(true)
      const context = title.mock.calls[0]?.[1]
      expect(context).toContain("original AAA video game")
      expect(context).toContain("playable protagonist")
      if (enabled) expect(context).toContain("A co-op adventure with dry humor.")
      else expect(context).not.toContain("A co-op adventure with dry humor.")
      expect(script).toHaveBeenCalledWith(parameters, "Eclipse Protocol", context)

      useStore.getState().setMode("blockbuster")
      useStore.getState().setMovieTitle("")
      expect(await useStore.getState().generateScript(mock(() => {}))).toBe(true)
      const movieContext = enabled ? "A co-op adventure with dry humor." : ""
      expect(title).toHaveBeenLastCalledWith(parameters, movieContext)
      expect(script).toHaveBeenLastCalledWith(parameters, "Eclipse Protocol", movieContext)
    })
  }

  for (const valid of [true, false]) {
    it(`processes context and exposes editable fields (valid JSON: ${valid})`, async () => {
      const client = new api.ApiClient("test-key", "")
      spyOn(api, "getApiClientAsync").mockResolvedValue(client)
      const data = { genre: "Comedy", setting: "Copenhagen", character: "Chef", conflict: "Lost recipe", plotTwist: "Secret friendship", movieTitle: "The Recipe" }
      spyOn(client, "generateContextData").mockResolvedValue(valid ? data : null)
      const script = spyOn(client, "generateScript")
      const parameters = { ...initialState.parameters, genre: "Drama" }
      useStore.setState({ parameters, movieTitle: "Existing", customContextEnabled: true, customContext: "Story idea" })
      await useStore.getState().processCustomContext(mock(() => {}))
      expect(useStore.getState().parameters.genre).toBe(valid ? "Comedy" : "Drama")
      expect(useStore.getState().movieTitle).toBe(valid ? "The Recipe" : "Existing")
      expect(useStore.getState().contextFieldsVisible).toBe(true)
      expect(useStore.getState().isProcessingContext).toBe(false)
      expect(script).not.toHaveBeenCalled()
      useStore.getState().setParameters({ ...useStore.getState().parameters, character: "Baker" })
      expect(useStore.getState().parameters.character).toBe("Baker")
    })
  }

  it("releases the context processing lock on API failure", async () => {
    spyOn(api, "getApiClientAsync").mockRejectedValue(new Error("Unavailable"))
    useStore.setState({ customContextEnabled: true, customContext: "Story idea" })
    await useStore.getState().processCustomContext(mock(() => {}))
    expect(useStore.getState().isProcessingContext).toBe(false)
  })

  for (const enabled of [true, false]) {
    it(`includes custom context only when enabled (${enabled})`, async () => {
      const client = new api.ApiClient("test-key", "")
      spyOn(api, "getApiClientAsync").mockResolvedValue(client)
      const title = spyOn(client, "generateMovieTitle").mockResolvedValue("Test Title")
      const script = spyOn(client, "generateScript").mockResolvedValue("Test Script")
      const parameters = { ...initialState.parameters, genre: "Comedy" }
      useStore.setState({ parameters, customContextEnabled: enabled, contextFieldsVisible: true, customContext: "  Dry humor in Copenhagen.  " })
      expect(await useStore.getState().generateScript(mock(() => {}))).toBe(true)
      const context = enabled ? "Dry humor in Copenhagen." : ""
      expect(title).toHaveBeenCalledWith(parameters, context)
      expect(script).toHaveBeenCalledWith(parameters, "Test Title", context)
      expect(useStore.getState().customContext).toBe("  Dry humor in Copenhagen.  ")
    })
  }

  it("handles vault failures and releases the script generation lock", async () => {
    spyOn(api, "getApiClientAsync").mockRejectedValue(new Error("Vault unavailable"))
    spyOn(console, "error").mockImplementation(() => {})
    const toast = mock(() => {})
    useStore.setState({ parameters: { ...initialState.parameters, genre: "Comedy" }, currentScript: "Existing script" })
    expect(await useStore.getState().generateScript(toast)).toBe(false)
    expect(useStore.getState().currentScript).toBe("Existing script")
    expect(useStore.getState().isGenerating).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Vault unavailable", variant: "destructive" }))
  })

  it("locks script generation before awaiting the API client to prevent duplicate charges", async () => {
    let resolveClient!: (client: api.ApiClient | null) => void
    const clientPromise = new Promise<api.ApiClient | null>((resolve) => { resolveClient = resolve })
    const getClient = spyOn(api, "getApiClientAsync").mockReturnValue(clientPromise)
    spyOn(console, "error").mockImplementation(() => {})
    useStore.setState({ parameters: { ...initialState.parameters, genre: "Comedy" } })
    const first = useStore.getState().generateScript(mock(() => {}))
    expect(await useStore.getState().generateScript(mock(() => {}))).toBe(false)
    expect(getClient).toHaveBeenCalledTimes(1)
    expect(useStore.getState().isGenerating).toBe(true)
    resolveClient(null)
    await first
    expect(useStore.getState().isGenerating).toBe(false)
  })

  it("handles vault failures and releases the audio generation lock", async () => {
    spyOn(api, "getApiClientAsync").mockRejectedValue(new Error("Vault unavailable"))
    spyOn(console, "error").mockImplementation(() => {})
    useStore.setState({ currentScript: "One hero remains." })
    expect(await useStore.getState().generateTrailerAudio(mock(() => {}), { current: null })).toBe(false)
    expect(useStore.getState().isGeneratingAudio).toBe(false)
    expect(useStore.getState().audioGenerationStatus.status).toBe("error")
  })

  it("invalidates audio made for a different script", () => {
    const buffer = { duration: 1 } as AudioBuffer
    useStore.setState({ currentScript: "Original", trailerAudioBuffer: buffer,
      audioGenerationStatus: { show: true, status: "success", message: "Ready", audioUrl: "blob:old" } })
    useStore.getState().setCurrentScript("Original")
    expect(useStore.getState().trailerAudioBuffer).toBe(buffer)
    useStore.getState().setCurrentScript("Rewritten")
    expect(useStore.getState().trailerAudioBuffer).toBeNull()
    expect(useStore.getState().audioGenerationStatus.show).toBe(false)
  })
})
