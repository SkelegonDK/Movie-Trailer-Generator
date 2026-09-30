"use client"

import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { AnimatePresence, motion } from "motion/react"
import { PARAMETER_MODES } from "@/lib/parameter-modes"

const fields = [
  ["genre", "Genre"],
  ["setting", "Setting"],
  ["character", "Main character"],
  ["conflict", "Conflict"],
  ["plotTwist", "Plot twist"],
] as const

export function MovieDetails({ onEdit }: { onEdit: () => void }) {
  const {
    parameters, movieTitle, customContext, customContextEnabled, mode,
    isProcessingContext, isGenerating, isGeneratingAudio, audioGenerationStatus,
    posterStatus, posterDataError, isGeneratingVideo, videoGenerationStatus,
  } = useStore()

  const busy = isProcessingContext || isGenerating || isGeneratingAudio || posterStatus === "loading" || isGeneratingVideo
  const status = isProcessingContext ? "Turning your idea into movie details…"
    : isGenerating ? "Writing your title and script…"
    : isGeneratingAudio ? audioGenerationStatus.message
    : posterStatus === "loading" ? "Creating your movie poster…"
    : isGeneratingVideo ? `${videoGenerationStatus.message} ${Math.round(videoGenerationStatus.progress * 100)}%`
    : videoGenerationStatus.status === "error" ? "Video export failed. Try again in Video."
    : posterDataError ? "Poster generation failed. Try again in Poster."
    : audioGenerationStatus.status === "error" ? "Audio generation failed. Try again in Audio."
    : videoGenerationStatus.status === "success" ? "Your trailer is ready to download."
    : posterStatus === "ready" ? "Poster ready. Bring it all together in Video."
    : audioGenerationStatus.status === "success" ? "Audio ready. Time for a movie poster."
    : "Your movie details stay here as you create."

  return (
    <aside aria-label="Movie details" className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-[#121212]/95">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-1 xl:px-4 xl:py-3">
        <h2 className="studio-eyebrow text-muted-foreground">Your production</h2>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit movie idea">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>
      <div tabIndex={0} aria-label="Movie title, parameters, and context" className="min-h-0 overflow-y-auto overscroll-contain p-3 xl:p-4 [overflow-wrap:anywhere]">
        <p className="mb-5 font-sans text-base font-medium leading-snug tracking-tight xl:text-xl">
          {movieTitle || "Your title will appear here"}
        </p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 xl:grid-cols-1 xl:gap-y-4">
          {fields.map(([key, label]) => (
            <div key={key}>
              <dt className="studio-eyebrow text-muted-foreground xl:mb-1">{label}</dt>
              <dd className="text-sm leading-relaxed">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={parameters[key] || "empty"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className={parameters[key] ? "block" : "block text-muted-foreground"}>
                    {parameters[key] || "Not set yet"}
                  </motion.span>
                </AnimatePresence>
              </dd>
            </div>
          ))}
          <div className="col-span-2 border-t pt-2 xl:col-span-1 xl:pt-3">
            <dt className="text-sm text-muted-foreground xl:mb-1">
              Context{customContext && !customContextEnabled ? " · not in use" : ""}
            </dt>
            <dd className="whitespace-pre-wrap text-sm leading-relaxed">
              {customContext || (customContextEnabled ? "Describe your idea in the Idea section." : `${PARAMETER_MODES[mode].label} mode. No custom context added.`)}
            </dd>
          </div>
        </dl>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="flex shrink-0 items-start gap-2 border-t px-3 py-2 xl:mt-auto xl:px-4 xl:py-3">
        {busy && <Loader2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />}
        <p className="text-sm leading-relaxed text-muted-foreground">{status}</p>
      </div>
    </aside>
  )
}
