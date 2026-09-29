import { afterEach, describe, expect, it, mock, spyOn } from "bun:test"
import * as api from "../lib/api-client"
import { useStore } from "../lib/store"

const initialState = useStore.getState()

afterEach(() => {
  mock.restore()
  useStore.setState(initialState, true)
})

describe("generation state", () => {
  it("handles vault failures and releases the script generation lock", async () => {
    spyOn(api, "getApiClientAsync").mockRejectedValue(new Error("Vault unavailable"))
    spyOn(console, "error").mockImplementation(() => {})
    const toast = mock(() => {})
    useStore.setState({ parameters: { ...initialState.parameters, genre: "Comedy" } })
    await useStore.getState().generateScript(toast)
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
    await useStore.getState().generateScript(mock(() => {}))
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
    await useStore.getState().generateTrailerAudio(mock(() => {}), { current: null })
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
