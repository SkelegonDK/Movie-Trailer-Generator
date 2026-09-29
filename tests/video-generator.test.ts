import { afterEach, describe, expect, mock, test } from "bun:test"
import { renderTrailerVideo } from "../lib/video-generator"
import { DEFAULT_CAPTION_STYLE } from "../lib/caption-style"

const restored: Array<() => void> = []
function replaceGlobal(name: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  restored.push(() => {
    if (original) Object.defineProperty(globalThis, name, original)
    else Reflect.deleteProperty(globalThis, name)
  })
}
afterEach(() => { while (restored.length) restored.pop()!() })

function setup(failure?: "constructor" | "start" | "recording", endSource = true) {
  const videoTrack = { stop: mock(() => {}) }
  const audioTrack = { stop: mock(() => {}) }
  const destination = {
    stream: { getAudioTracks: () => [audioTrack], getTracks: () => [audioTrack] },
    disconnect: mock(() => {}),
  }
  const source = {
    buffer: null,
    onended: null as (() => void) | null,
    connect: mock(() => {}), disconnect: mock(() => {}), stop: mock(() => {}),
    start() { if (endSource) queueMicrotask(() => this.onended?.()) },
  }
  const recorderStop = mock(() => {})
  replaceGlobal("MediaRecorder", class {
    static isTypeSupported() { return true }
    state = "inactive"
    onstop?: () => void
    onerror?: () => void
    ondataavailable?: (event: { data: Blob }) => void
    constructor() { if (failure === "constructor") throw new Error("constructor failed") }
    start() {
      if (failure === "start") throw new Error("start failed")
      this.state = "recording"
      if (failure === "recording") queueMicrotask(() => this.onerror?.())
    }
    stop() {
      recorderStop()
      this.state = "inactive"
      this.ondataavailable?.({ data: new Blob(["video"]) })
      this.onstop?.()
    }
  })
  replaceGlobal("MediaStream", class { constructor(_tracks: unknown[]) {} })
  replaceGlobal("Image", class {
    width = 1080; height = 1920
    onload?: () => void
    set src(_url: string) { queueMicrotask(() => this.onload?.()) }
  })
  replaceGlobal("document", {
    createElement: () => ({
      getContext: () => ({
        fillRect() {}, drawImage() {}, strokeText() {}, fillText() {},
        measureText: () => ({ width: 100 }),
      }),
      captureStream: () => ({ getVideoTracks: () => [videoTrack], getTracks: () => [videoTrack] }),
    }),
  })
  const cancel = mock(() => {})
  replaceGlobal("requestAnimationFrame", () => 7)
  replaceGlobal("cancelAnimationFrame", cancel)
  const options = {
    posterUrl: "data:image/png;base64,stub",
    audioBuffer: { duration: 1 } as AudioBuffer,
    script: "Hello there.", style: DEFAULT_CAPTION_STYLE,
    audioCtx: {
      currentTime: 0, resume: async () => {},
      createMediaStreamDestination: () => destination,
      createBufferSource: () => source,
    } as unknown as AudioContext,
  }
  return { options, videoTrack, audioTrack, destination, source, recorderStop, cancel }
}

describe("renderTrailerVideo resource lifecycle", () => {
  for (const failure of [undefined, "constructor", "start", "recording"] as const) {
    test(`releases all tracks and nodes after ${failure ?? "success"}`, async () => {
      const state = setup(failure)
      if (failure) await expect(renderTrailerVideo(state.options)).rejects.toThrow()
      else {
        const video = await renderTrailerVideo(state.options)
        expect(video.duration).toBe(1)
        URL.revokeObjectURL(video.url)
      }
      expect(state.videoTrack.stop).toHaveBeenCalledTimes(1)
      expect(state.audioTrack.stop).toHaveBeenCalledTimes(1)
      expect(state.source.stop).toHaveBeenCalledTimes(1)
      expect(state.source.disconnect).toHaveBeenCalledTimes(1)
      expect(state.destination.disconnect).toHaveBeenCalledTimes(1)
      expect(state.source.onended).toBeNull()
      expect(state.cancel).toHaveBeenCalled()
    })
  }
  test("aborting an active recording releases capture resources", async () => {
    const state = setup(undefined, false)
    const controller = new AbortController()
    const rendering = renderTrailerVideo({ ...state.options, signal: controller.signal })
    await new Promise((resolve) => setTimeout(resolve, 0))
    controller.abort()
    await expect(rendering).rejects.toThrow()
    expect(state.recorderStop).toHaveBeenCalledTimes(1)
    expect(state.videoTrack.stop).toHaveBeenCalledTimes(1)
    expect(state.audioTrack.stop).toHaveBeenCalledTimes(1)
    expect(state.source.disconnect).toHaveBeenCalledTimes(1)
  })
})
