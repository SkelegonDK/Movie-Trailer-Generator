import { buildCaptions, getActiveCaption } from "./captions"
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  drawTrailerFrame,
  loadPosterImage,
  ensureCaptionFont,
  type CaptionStyle,
} from "./video-renderer"

export interface RenderTrailerVideoOptions {
  posterUrl: string
  /** Mixed trailer audio (voiceover + music). Its duration defines the video length. */
  audioBuffer: AudioBuffer
  script: string
  style: CaptionStyle
  /** Shared AudioContext used both for playback capture and timing. */
  audioCtx: AudioContext
  /** Called with 0..1 progress while the video renders in real time. */
  onProgress?: (fraction: number) => void
  /** Cancels recording and releases capture resources. */
  signal?: AbortSignal
}

export interface RenderedVideo {
  /** Blob URL of the rendered video. */
  url: string
  mimeType: string
  extension: string
  duration: number
}

/**
 * Picks the best supported MediaRecorder output format. MP4 (H.264/AAC) is
 * preferred because Instagram accepts it directly; WebM is the fallback.
 */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate
  }
  return null
}

function extensionFor(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm"
}

/**
 * Renders an Instagram-ready 9:16 trailer video: the poster as a static
 * background with captions timed to the voiceover, plus the mixed trailer
 * audio. Frames are drawn to a 1080x1920 canvas in real time (driven by the
 * AudioContext clock) while MediaRecorder captures the canvas stream and a
 * MediaStreamDestination audio track.
 * @param {RenderTrailerVideoOptions} opts - Poster, audio, script and caption style.
 * @returns {Promise<RenderedVideo>} The rendered video as a Blob URL.
 * @example
 * const video = await renderTrailerVideo({ posterUrl, audioBuffer, script, style, audioCtx });
 * downloadVideo(video.url, `${movieTitle}_trailer.${video.extension}`);
 */
export async function renderTrailerVideo(opts: RenderTrailerVideoOptions): Promise<RenderedVideo> {
  const mimeType = pickMimeType()
  if (!mimeType) {
    throw new Error("Video recording is not supported in this browser. Please use Chrome or Safari.")
  }

  const canvas = document.createElement("canvas")
  canvas.width = VIDEO_WIDTH
  canvas.height = VIDEO_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not create a canvas rendering context")

  const [poster] = await Promise.all([loadPosterImage(opts.posterUrl), ensureCaptionFont()])
  const captions = buildCaptions(opts.script, opts.audioBuffer.duration, opts.style.maxWords)
  const duration = opts.audioBuffer.duration

  opts.signal?.throwIfAborted()
  await opts.audioCtx.resume()
  opts.signal?.throwIfAborted()

  let canvasStream: MediaStream | undefined
  let streamDestination: MediaStreamAudioDestinationNode | undefined
  let source: AudioBufferSourceNode | undefined
  let recorder: MediaRecorder | undefined
  let rafId = 0
  let stopTimer: ReturnType<typeof setTimeout> | undefined
  let abortRecording: (() => void) | undefined

  const draw = (elapsed: number) => {
    const clamped = Math.max(0, Math.min(elapsed, duration))
    drawTrailerFrame(ctx, {
      poster,
      captionText: getActiveCaption(captions, clamped)?.text ?? null,
      style: opts.style,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    })
  }

  try {
    // Capture starts with a complete frame, even before the first animation tick.
    draw(0)
    canvasStream = canvas.captureStream(30)
    streamDestination = opts.audioCtx.createMediaStreamDestination()
    source = opts.audioCtx.createBufferSource()
    source.buffer = opts.audioBuffer
    source.connect(streamDestination)

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...streamDestination.stream.getAudioTracks(),
    ])
    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 12_000_000,
    })
    const activeRecorder = recorder
    const activeSource = source
    const chunks: Blob[] = []
    const blob = await new Promise<Blob>((resolve, reject) => {
      activeRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data)
      }
      activeRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
      activeRecorder.onerror = () => reject(new Error("Video recording failed"))
      abortRecording = () => reject(opts.signal?.reason ?? new DOMException("Recording cancelled", "AbortError"))
      opts.signal?.addEventListener("abort", abortRecording, { once: true })
      if (opts.signal?.aborted) {
        abortRecording()
        return
      }

      const startedAt = opts.audioCtx.currentTime
      const tick = () => {
        const elapsed = opts.audioCtx.currentTime - startedAt
        draw(elapsed)
        opts.onProgress?.(Math.min(1, elapsed / duration))
        rafId = requestAnimationFrame(tick)
      }
      activeSource.onended = () => {
        draw(duration)
        cancelAnimationFrame(rafId)
        opts.onProgress?.(1)
        // Allow the last canvas frame to reach the recorder before stopping.
        stopTimer = setTimeout(() => {
          if (activeRecorder.state !== "inactive") activeRecorder.stop()
        }, 150)
      }
      activeRecorder.start(250)
      activeSource.start()
      rafId = requestAnimationFrame(tick)
    })

    opts.signal?.throwIfAborted()
    return {
      url: URL.createObjectURL(blob),
      mimeType,
      extension: extensionFor(mimeType),
      duration,
    }
  } finally {
    if (abortRecording) opts.signal?.removeEventListener("abort", abortRecording)
    cancelAnimationFrame(rafId)
    if (stopTimer !== undefined) clearTimeout(stopTimer)
    if (source) {
      source.onended = null
      try { source.stop() } catch { /* The source may not have started. */ }
      source.disconnect()
    }
    if (recorder && recorder.state !== "inactive") recorder.stop()
    canvasStream?.getTracks().forEach((track) => track.stop())
    streamDestination?.stream.getTracks().forEach((track) => track.stop())
    streamDestination?.disconnect()
  }
}
