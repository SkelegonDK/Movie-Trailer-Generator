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
import { getWorkflowAccess } from "@/lib/workflow"
import { motion, useReducedMotion } from "motion/react"

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
  const reduceMotion = useReducedMotion()
  const {
    parameters, currentScript, trailerAudioBuffer, posterUrl, posterStatus,
    isProcessingContext, isGenerating, isGeneratingAudio, isGeneratingVideo, videoGenerationStatus,
  } = useStore()
  const index = steps.findIndex((item) => item.id === step)
  const busy = isProcessingContext || isGenerating || isGeneratingAudio || posterStatus === "loading" || isGeneratingVideo
  const access = getWorkflowAccess({ currentScript, trailerAudioBuffer, posterUrl, posterStatus })
  const nextStep = steps[index + 1]?.id
  const canAdvance = !!nextStep && access[nextStep] && !busy
  const missingAssetMessage = !currentScript.trim()
    ? "Generate a script to continue."
    : !trailerAudioBuffer
      ? "Generate trailer audio to continue."
      : "Generate a poster to continue."
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
      const next = steps[Math.min(steps.findIndex((item) => item.id === from) + 1, steps.length - 1)].id
      return getWorkflowAccess(useStore.getState())[next] ? next : current
    })
  }, [])

  const navigateTo = (target: Step) => {
    if (getWorkflowAccess(useStore.getState())[target]) setStep(target)
  }

  useEffect(() => {
    const available = getWorkflowAccess({ currentScript, trailerAudioBuffer, posterUrl, posterStatus })
    if (!available[step]) {
      const fallback = steps.slice(0, steps.findIndex((item) => item.id === step)).reverse().find((item) => available[item.id])
      setStep(fallback?.id ?? "idea")
    }
  }, [step, currentScript, trailerAudioBuffer, posterUrl, posterStatus])

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
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[1600px] flex-col gap-5 p-4 sm:p-7 md:h-dvh lg:p-8">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex shrink-0 items-end justify-between gap-3 pb-2 sm:pb-4">
        <div className="space-y-3">
          <p className="studio-eyebrow text-muted-foreground">The trailer studio <span aria-hidden className="mx-2">/</span> A little idea. A big screen.</p>
          <h1 className="headline text-2xl sm:text-4xl">Make a little movie magic.</h1>
        </div>
        <span className="studio-eyebrow shrink-0 tabular-nums text-muted-foreground"><span className="text-foreground">0{index + 1}</span> / 0{steps.length}</span>
      </motion.header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,auto)_minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-1">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="movie-details-shell max-h-[28dvh] min-h-0 xl:col-start-2 xl:row-start-1 xl:max-h-none [&>aside]:h-full">
          <MovieDetails onEdit={() => setStep("idea")} />
        </motion.div>

        <Tabs value={step} onValueChange={(value) => navigateTo(value as Step)} className="flex min-h-0 min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
          <TabsList aria-label="Trailer workflow" className="grid h-auto shrink-0 grid-cols-5 gap-0 rounded-none border-b bg-transparent p-0">
            {steps.map((item, i) => (
              <TabsTrigger key={item.id} value={item.id} disabled={!access[item.id] || (busy && i > index)} className="workflow-tab relative min-h-12 min-w-0 gap-2 rounded-none px-1 py-3 text-xs transition-colors hover:text-foreground data-[state=active]:text-foreground sm:px-3 sm:text-sm">
                <span aria-hidden className="hidden h-5 w-5 shrink-0 items-center justify-center font-mono text-[10px] text-muted-foreground sm:flex">
                  {complete[item.id] ? <Check className="h-3 w-3 text-success" /> : `0${i + 1}`}
                </span>
                {item.label}
                {step === item.id && <motion.span layoutId="workflow-indicator" className="absolute inset-x-0 bottom-[-1px] h-px bg-primary" transition={{ duration: reduceMotion ? 0 : 0.35 }} />}
                <span className="sr-only">{complete[item.id] ? ", ready" : ""}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="studio-panel min-h-0 flex-1 overflow-clip rounded-lg border">
            <motion.div ref={trackRef} className="flex h-full w-full" animate={{ x: `-${index * 100}%` }} initial={false} transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {steps.map((item) => (
                <TabsContent key={item.id} value={item.id} forceMount inert={step !== item.id} aria-hidden={step !== item.id} data-step={item.id} className="@container m-0 h-full min-w-0 basis-full shrink-0 overflow-y-auto overscroll-contain p-4 sm:p-6 [overflow-wrap:anywhere]">
                  {item.id === "idea" && <ParameterSelection disabled={busy} onGenerated={() => advanceFrom("idea")} />}
                  {item.id === "script" && <ScriptEditor disabled={busy} />}
                  {item.id === "audio" && <AudioGenerator active={step === "audio"} disabled={busy} onGenerated={() => advanceFrom("audio")} />}
                  {item.id === "poster" && <PosterGenerator disabled={busy} onGenerated={() => advanceFrom("poster")} />}
                  {item.id === "video" && <VideoGenerator active={step === "video"} disabled={busy} />}
                </TabsContent>
              ))}
            </motion.div>
          </motion.div>

          <footer className="flex shrink-0 items-center justify-between gap-3">
            <Button variant="outline" disabled={index === 0} onClick={() => setStep(steps[index - 1].id)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <p className="hidden text-sm text-muted-foreground sm:block">{index === 4 ? "Ready for the big screen?" : busy ? "Preparing your assets…" : canAdvance ? "One scene at a time." : missingAssetMessage}</p>
            <Button variant="default" disabled={!canAdvance} onClick={() => nextStep && navigateTo(nextStep)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </footer>
        </Tabs>
      </div>
    </div>
  )
}
