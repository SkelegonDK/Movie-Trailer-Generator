"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Clapperboard, Download, Loader2, Pause, Play, Video } from "lucide-react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAudioEngineRefs } from "@/lib/audio-engine"
import { buildCaptions, getActiveCaption } from "@/lib/captions"
import {
  drawTrailerFrame,
  loadPosterImage,
  ensureCaptionFont,
} from "@/lib/video-renderer"
import { renderTrailerVideo, type RenderedVideo } from "@/lib/video-generator"
import { saveLibraryItem, type LibraryItem } from "@/lib/content-library"
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  HORIZONTAL_POSITION_MAX,
  HORIZONTAL_POSITION_MIN,
  MAX_WORDS_MAX,
  MAX_WORDS_MIN,
  VERTICAL_ALIGN_PRESETS,
  VERTICAL_POSITION_MAX,
  VERTICAL_POSITION_MIN,
  type HorizontalAlign,
} from "@/lib/caption-style"

const PREVIEW_WIDTH = 540
const PREVIEW_HEIGHT = 960

function slugify(title: string): string {
  const safe = (title || "untitled-trailer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return safe || "untitled-trailer"
}

const ALIGN_ICONS: Record<HorizontalAlign, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
}

const VERTICAL_ALIGN_ICONS = {
  top: AlignVerticalJustifyStart,
  middle: AlignVerticalJustifyCenter,
  bottom: AlignVerticalJustifyEnd,
} as const

/** Inspector-style row: label on the left, control in the middle, value on the right. */
function InspectorRow({
  label,
  children,
  value,
}: {
  label?: string
  children?: React.ReactNode
  value?: React.ReactNode
}) {
  if (children === undefined) {
    return (
      <div className="flex min-h-[44px] items-center border-b border-border px-1 py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    )
  }
  return (
    <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:flex border-b border-border px-1 py-1.5 last:border-b-0">
      {label !== undefined && (
        <span className="min-w-0 sm:w-32 sm:shrink-0 text-sm text-muted-foreground">{label}</span>
      )}
      <div className="col-span-2 row-start-2 flex min-w-0 flex-1 items-center justify-center gap-1 sm:order-2">{children}</div>
      {value !== undefined && (
        <span className="col-start-2 row-start-1 w-14 shrink-0 sm:order-3 text-right text-sm tabular-nums">{value}</span>
      )}
    </div>
  )
}

function IconButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  )
}

export function VideoGenerator({ active = true, disabled = false }: { active?: boolean; disabled?: boolean }) {
  const {
    movieTitle,
    currentScript,
    parameters,
    mode,
    posterUrl,
    posterStatus,
    trailerAudioBuffer,
    captionStyle,
    setCaptionStyle,
    videoGenerationStatus,
    setVideoGenerationStatus,
    isGeneratingVideo,
    setIsGeneratingVideo,
  } = useStore()
  const { toast } = useToast()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const posterImageRef = useRef<HTMLImageElement | null>(null)
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const previewStartRef = useRef(0)
  const rafRef = useRef(0)
  const renderAbortRef = useRef<AbortController | null>(null)

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [renderedVideo, setRenderedVideo] = useState<RenderedVideo | null>(null)

  const audioDuration = trailerAudioBuffer?.duration ?? 0

  const captions = useMemo(
    () => buildCaptions(currentScript, audioDuration, captionStyle.maxWords),
    [currentScript, audioDuration, captionStyle.maxWords],
  )

  const drawPreviewFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      drawTrailerFrame(ctx, {
        poster: posterImageRef.current,
        captionText: getActiveCaption(captions, time)?.text ?? null,
        style: captionStyle,
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
      })
    },
    [captions, captionStyle],
  )

  // Load the poster whenever it changes, then draw the initial preview frame.
  useEffect(() => {
    let cancelled = false
    if (!posterUrl) {
      posterImageRef.current = null
      return
    }
    loadPosterImage(posterUrl)
      .then(async (image) => {
        if (cancelled) return
        posterImageRef.current = image
        await ensureCaptionFont()
        if (!cancelled) drawPreviewFrame(previewTime)
      })
      .catch(() => {
        if (cancelled) return
        posterImageRef.current = null
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterUrl, drawPreviewFrame])

  // Redraw when the style or scrub position changes while paused.
  useEffect(() => {
    if (!isPreviewPlaying) drawPreviewFrame(previewTime)
  }, [isPreviewPlaying, previewTime, drawPreviewFrame])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      previewSourceRef.current?.stop()
      previewSourceRef.current?.disconnect()
    }
  }, [])

  const stopPreview = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    previewSourceRef.current?.stop()
    previewSourceRef.current?.disconnect()
    previewSourceRef.current = null
    setIsPreviewPlaying(false)
  }, [])

  useEffect(() => {
    if (!active) {
      stopPreview()
      videoRef.current?.pause()
    }
  }, [active, stopPreview])

  // Output belongs to these exact inputs; discard it when any input changes.
  useEffect(() => {
    setRenderedVideo(null)
    setVideoGenerationStatus({ show: false, status: "idle", message: "", progress: 0 })
    return () => {
      renderAbortRef.current?.abort()
      renderAbortRef.current = null
      setIsGeneratingVideo(false)
    }
  }, [posterUrl, trailerAudioBuffer, currentScript, captionStyle, setVideoGenerationStatus, setIsGeneratingVideo])

  useEffect(() => {
    stopPreview()
    setPreviewTime(0)
  }, [trailerAudioBuffer, stopPreview])

  useEffect(() => {
    return () => {
      if (renderedVideo) URL.revokeObjectURL(renderedVideo.url)
    }
  }, [renderedVideo])

  const startPreview = useCallback(() => {
    if (!trailerAudioBuffer) return
    const { audioCtxRef } = getAudioEngineRefs()
    let audioCtx = audioCtxRef.current
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = audioCtx
    }
    audioCtx.resume()

    stopPreview()

    const source = audioCtx.createBufferSource()
    source.buffer = trailerAudioBuffer
    source.connect(audioCtx.destination)
    previewSourceRef.current = source

    const startTime = previewTime >= audioDuration - 0.05 ? 0 : previewTime
    if (startTime !== previewTime) setPreviewTime(0)
    previewStartRef.current = audioCtx.currentTime - startTime
    source.start(0, startTime)

    const tick = () => {
      if (!audioCtx) return
      const elapsed = audioCtx.currentTime - previewStartRef.current
      const clamped = Math.max(0, Math.min(elapsed, audioDuration))
      setPreviewTime(clamped)
      drawPreviewFrame(clamped)
      if (elapsed >= audioDuration) {
        stopPreview()
        setPreviewTime(audioDuration)
        drawPreviewFrame(audioDuration)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    setIsPreviewPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [trailerAudioBuffer, audioDuration, previewTime, drawPreviewFrame, stopPreview])

  const handleGenerateVideo = async () => {
    if (!posterUrl || !trailerAudioBuffer || renderAbortRef.current) return
    const controller = new AbortController()
    renderAbortRef.current = controller
    const { audioCtxRef } = getAudioEngineRefs()
    stopPreview()
    setRenderedVideo(null)
    setIsGeneratingVideo(true)
    setVideoGenerationStatus({ show: true, status: "generating", message: "Rendering video...", progress: 0 })

    try {
      let audioCtx = audioCtxRef.current
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioCtxRef.current = audioCtx
      }

      const video = await renderTrailerVideo({
        posterUrl,
        audioBuffer: trailerAudioBuffer,
        script: currentScript,
        style: captionStyle,
        audioCtx,
        signal: controller.signal,
        onProgress: (progress) =>
          setVideoGenerationStatus({
            show: true,
            status: "generating",
            message: "Rendering video in real time...",
            progress,
          }),
      })
      if (controller.signal.aborted) {
        URL.revokeObjectURL(video.url)
        return
      }
      let saved: LibraryItem | undefined
      try { saved = await saveLibraryItem({
        type: "video", title: movieTitle, script: currentScript,
        parameters, mode,
        media: video.blob, extension: video.extension, duration: video.duration,
      }) } catch { /* retain the completed video for an immediate download */ }
      if (controller.signal.aborted) {
        URL.revokeObjectURL(video.url)
        return
      }
      setRenderedVideo({ ...video, downloadUrl: saved?.downloadUrl })
      if (!saved) toast({ title: "Video wasn't saved to Library", description: "Your video is ready here. Download it before leaving this page.", variant: "destructive" })
      setVideoGenerationStatus({
        show: true,
        status: "success",
        message: "Trailer video ready!",
        progress: 1,
        videoUrl: video.url,
        videoExtension: video.extension,
      })
      toast({ title: "Trailer video ready", description: "Your trailer is ready to download and share." })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : "An unknown error occurred."
      setVideoGenerationStatus({ show: true, status: "error", message, progress: 0 })
      toast({ title: "Video Generation Failed", description: message, variant: "destructive" })
    } finally {
      if (renderAbortRef.current === controller) {
        renderAbortRef.current = null
        setIsGeneratingVideo(false)
      }
    }
  }

  const downloadVideo = () => {
    if (!renderedVideo) return
    const link = document.createElement("a")
    link.href = renderedVideo.downloadUrl ?? renderedVideo.url
    link.download = `${slugify(movieTitle)}_trailer.${renderedVideo.extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!posterUrl || posterStatus !== "ready" || !trailerAudioBuffer) {
    return (
      <div className="space-y-6">
        <h2 className="headline text-2xl">The grand finale</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Bring your trailer to life</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Make your audio and poster first. Then preview your trailer, style the captions, and export your movie.</p>
            <ul className="space-y-2">
              <li>{trailerAudioBuffer ? "✓ Audio ready" : "Create your narration and music in Audio."}</li>
              <li>{posterUrl && posterStatus === "ready" ? "✓ Poster ready" : "Create your artwork in Poster."}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canGenerate = !disabled && !isGeneratingVideo && videoGenerationStatus.status !== "generating"

  return (
    <div className="space-y-6">
      <h2 className="headline text-2xl">Trailer video</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video preview & captions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col @3xl:flex-row gap-6">
          <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto @3xl:mx-0">
            <canvas
              ref={canvasRef}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
              className="w-full rounded-lg border"
              aria-label="Trailer video preview"
            />
            <Slider
              value={[Math.min(previewTime, audioDuration)]}
              max={Math.max(audioDuration, 0.1)}
              step={0.05}
              onValueChange={(value) => {
                if (isPreviewPlaying) stopPreview()
                setPreviewTime(value[0])
              }}
              aria-label="Preview timeline"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{previewTime.toFixed(1)}s</span> / <span>{audioDuration.toFixed(1)}s</span>
            </div>
            <Button
              onClick={() => (isPreviewPlaying ? stopPreview() : startPreview())}
              variant="outline"
              className="w-full"
              aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
            >
              {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPreviewPlaying ? "Pause preview" : "Play preview"}
            </Button>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-lg border bg-muted/30 px-3">
              <InspectorRow label="Font size" value={captionStyle.fontSize.toFixed(1)}>
                <Slider
                  value={[captionStyle.fontSize]}
                  min={FONT_SIZE_MIN}
                  max={FONT_SIZE_MAX}
                  step={0.25}
                  onValueChange={(value) => setCaptionStyle({ ...captionStyle, fontSize: value[0] })}
                  className="max-w-[220px]"
                  aria-label="Caption font size"
                />
              </InspectorRow>

              <InspectorRow label="Alignment">
                {(["left", "center", "right"] as const).map((align) => {
                  const Icon = ALIGN_ICONS[align]
                  return (
                    <IconButton
                      key={align}
                      active={captionStyle.horizontalAlign === align}
                      label={`${align} alignment`}
                      onClick={() => setCaptionStyle({ ...captionStyle, horizontalAlign: align })}
                    >
                      <Icon className="h-4 w-4" />
                    </IconButton>
                  )
                })}
              </InspectorRow>

              <InspectorRow label="Vertical alignment">
                {VERTICAL_ALIGN_PRESETS.map((preset) => {
                  const Icon = VERTICAL_ALIGN_ICONS[preset.label]
                  return (
                    <IconButton
                      key={preset.label}
                      active={Math.abs(captionStyle.verticalPosition - preset.position) < 0.5}
                      label={`${preset.label} vertical alignment`}
                      onClick={() => setCaptionStyle({ ...captionStyle, verticalPosition: preset.position })}
                    >
                      <Icon className="h-4 w-4" />
                    </IconButton>
                  )
                })}
              </InspectorRow>

              <InspectorRow label="All caps">
                <Label htmlFor="all-caps-captions" className="flex h-11 w-11 cursor-pointer items-center justify-center">
                  <Checkbox
                    id="all-caps-captions"
                    checked={captionStyle.allCaps}
                    onCheckedChange={(checked) => setCaptionStyle({ ...captionStyle, allCaps: checked === true })}
                    aria-label="All caps captions"
                  />
                </Label>
              </InspectorRow>

              <InspectorRow label="Words per caption" value={String(captionStyle.maxWords)}>
                <Slider
                  value={[captionStyle.maxWords]}
                  min={MAX_WORDS_MIN}
                  max={MAX_WORDS_MAX}
                  step={1}
                  onValueChange={(value) => {
                    if (isPreviewPlaying) stopPreview()
                    setCaptionStyle({ ...captionStyle, maxWords: value[0] })
                  }}
                  className="max-w-[220px]"
                  aria-label="Words per caption"
                />
              </InspectorRow>

              <InspectorRow label="Position" />

              <InspectorRow label="X" value={`${Math.round(captionStyle.horizontalPosition)} %`}>
                <Slider
                  value={[captionStyle.horizontalPosition]}
                  min={HORIZONTAL_POSITION_MIN}
                  max={HORIZONTAL_POSITION_MAX}
                  step={1}
                  onValueChange={(value) => setCaptionStyle({ ...captionStyle, horizontalPosition: value[0] })}
                  className="max-w-[220px]"
                  aria-label="Caption horizontal position"
                />
              </InspectorRow>

              <InspectorRow label="Y" value={`${Math.round(captionStyle.verticalPosition)} %`}>
                <Slider
                  value={[captionStyle.verticalPosition]}
                  min={VERTICAL_POSITION_MIN}
                  max={VERTICAL_POSITION_MAX}
                  step={1}
                  onValueChange={(value) => setCaptionStyle({ ...captionStyle, verticalPosition: value[0] })}
                  className="max-w-[220px]"
                  aria-label="Caption vertical position"
                />
              </InspectorRow>
            </div>

            <Button
              onClick={handleGenerateVideo}
              variant="skeuomorphic-primary"
              aria-busy={isGeneratingVideo}
              disabled={!canGenerate}
              className="w-full sm:w-auto"
            >
              {isGeneratingVideo ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Clapperboard className="w-4 h-4" />
              )}
              {isGeneratingVideo ? "Rendering…" : "Generate video"}
            </Button>

            {videoGenerationStatus.show && videoGenerationStatus.status === "generating" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{videoGenerationStatus.message}</p>
                <div role="progressbar" aria-label="Video rendering progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(videoGenerationStatus.progress * 100)} className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full origin-left rounded-full bg-primary transition-transform"
                    style={{ transform: `scaleX(${videoGenerationStatus.progress})` }}
                  />
                </div>
              </div>
            )}

            {renderedVideo && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  controls
                  className="w-full max-w-xs rounded-lg border"
                  src={renderedVideo.url}
                />
                <Button onClick={downloadVideo} variant="skeuomorphic-success" className="w-full sm:w-auto">
                  <Download className="w-4 h-4" />
                  Download video
                </Button>
              </div>
            )}

            {videoGenerationStatus.status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {videoGenerationStatus.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
