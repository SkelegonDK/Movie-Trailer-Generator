"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { ParameterSelection } from "@/components/parameter-selection"
import { ScriptEditor } from "@/components/script-editor"
import { AudioGenerator } from "@/components/audio-generator"
import { PosterGenerator } from "@/components/poster-generator"
import { VideoGenerator } from "@/components/video-generator"
import { MovieDetails } from "@/components/movie-details"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"

const steps = [
  { id: "idea", label: "Idea" },
  { id: "script", label: "Script" },
  { id: "audio", label: "Audio" },
  { id: "poster", label: "Poster" },
  { id: "video", label: "Video" },
] as const

type Step = typeof steps[number]["id"]

export default function GeneratorPage() {
  const [step, setStep] = useState<Step>("idea")
  const trackRef = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  const {
    parameters, currentScript, trailerAudioBuffer, posterUrl, posterStatus,
    isProcessingContext, isGenerating, isGeneratingAudio, isGeneratingVideo, videoGenerationStatus,
  } = useStore()
  const index = steps.findIndex((item) => item.id === step)
  const busy = isProcessingContext || isGenerating || isGeneratingAudio || posterStatus === "loading" || isGeneratingVideo
  const complete = {
    idea: !!parameters.genre.trim(),
    script: !!currentScript.trim(),
    audio: !!trailerAudioBuffer,
    poster: !!posterUrl && posterStatus === "ready",
    video: videoGenerationStatus.status === "success",
  }

  const advanceFrom = useCallback((from: Step) => {
    setStep((current) => {
      if (current !== from) return current
      return steps[Math.min(steps.findIndex((item) => item.id === from) + 1, steps.length - 1)].id
    })
  }, [])

  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    const panel = trackRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`)
    panel?.scrollTo({ top: 0 })
    // Keep tab navigation focused on its tab; move focus out of a slide that became inert.
    if (document.activeElement === document.body || trackRef.current?.contains(document.activeElement)) {
      panel?.focus({ preventScroll: true })
    }
  }, [step])

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[1600px] flex-col gap-4 p-3 sm:p-6 md:h-dvh">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="headline text-xl sm:text-3xl">Make a little movie magic</h1>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{index + 1} / {steps.length}</span>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,auto)_minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-1">
        <div className="movie-details-shell max-h-[36dvh] min-h-0 xl:col-start-2 xl:row-start-1 xl:max-h-none [&>aside]:h-full">
          <MovieDetails onEdit={() => setStep("idea")} />
        </div>

        <Tabs value={step} onValueChange={(value) => setStep(value as Step)} className="flex min-h-0 min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
          <TabsList aria-label="Trailer workflow" className="grid h-auto shrink-0 grid-cols-5 gap-1 rounded-none bg-transparent p-0 sm:gap-2">
            {steps.map((item, i) => (
              <TabsTrigger key={item.id} value={item.id} className="min-h-11 min-w-0 gap-2 rounded-md border border-transparent px-1 py-2 transition-colors data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground sm:px-3">
                <span aria-hidden className="hidden h-5 w-5 shrink-0 items-center justify-center text-sm sm:flex">
                  {complete[item.id] ? <Check className="h-4 w-4 text-success" /> : i + 1}
                </span>
                {item.label}
                <span className="sr-only">{complete[item.id] ? ", ready" : ""}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
            <div ref={trackRef} className="flex h-full w-full transition-transform duration-300 ease-[var(--ease-out)] motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
              {steps.map((item) => (
                <TabsContent key={item.id} value={item.id} forceMount inert={step !== item.id} aria-hidden={step !== item.id} data-step={item.id} className="@container m-0 h-full min-w-0 basis-full shrink-0 overflow-y-auto overscroll-contain p-4 sm:p-6 [overflow-wrap:anywhere]">
                  {item.id === "idea" && <ParameterSelection disabled={busy} onGenerated={() => advanceFrom("idea")} />}
                  {item.id === "script" && <ScriptEditor disabled={busy} />}
                  {item.id === "audio" && <AudioGenerator active={step === "audio"} disabled={busy} onGenerated={() => advanceFrom("audio")} />}
                  {item.id === "poster" && <PosterGenerator disabled={busy} onGenerated={() => advanceFrom("poster")} />}
                  {item.id === "video" && <VideoGenerator active={step === "video"} disabled={busy} />}
                </TabsContent>
              ))}
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3">
            <Button variant="outline" disabled={index === 0} onClick={() => setStep(steps[index - 1].id)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <p className="hidden text-sm text-muted-foreground sm:block">{index === 4 ? "Ready for the big screen?" : "One scene at a time."}</p>
            <Button variant="skeuomorphic-secondary" disabled={index === steps.length - 1} onClick={() => setStep(steps[index + 1].id)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </footer>
        </Tabs>
      </div>
    </div>
  )
}
