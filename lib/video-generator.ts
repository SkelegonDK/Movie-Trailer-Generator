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

  const canvasStream = canvas.captureStream(30)
  await opts.audioCtx.resume()

  const streamDestination = opts.audioCtx.createMediaStreamDestination()
  const source = opts.audioCtx.createBufferSource()
  source.buffer = opts.audioBuffer
  source.connect(streamDestination)

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...streamDestination.stream.getAudioTracks(),
  ])

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 12_000_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  }

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    recorder.onerror = () => reject(new Error("Video recording failed"))
  })

  let rafId = 0
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

  let startedAt = 0
  const tick = () => {
    const elapsed = opts.audioCtx.currentTime - startedAt
    draw(elapsed)
    opts.onProgress?.(Math.min(1, elapsed / duration))
    rafId = requestAnimationFrame(tick)
  }

  // A single sample of silence keeps the audio track alive for the full
  // duration even if the voiceover buffer ends a few ms early.
  const keepAlive = opts.audioCtx.createBufferSource()
  const silence = opts.audioCtx.createBuffer(
    1,
    Math.max(1, Math.ceil(duration * opts.audioCtx.sampleRate)),
    opts.audioCtx.sampleRate,
  )
  keepAlive.buffer = silence
  keepAlive.connect(streamDestination)

  recorder.start(250)
  keepAlive.start()
  source.onended = () => {
    draw(duration)
    cancelAnimationFrame(rafId)
    opts.onProgress?.(1)
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop()
    }, 150)
  }

  startedAt = opts.audioCtx.currentTime
  source.start()
  rafId = requestAnimationFrame(tick)

  const blob = await finished
  cancelAnimationFrame(rafId)
  canvasStream.getTracks().forEach((track) => track.stop())

  return {
    url: URL.createObjectURL(blob),
    mimeType,
    extension: extensionFor(mimeType),
    duration,
  }
}
