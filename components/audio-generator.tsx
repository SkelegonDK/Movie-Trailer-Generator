"use client"

import { useStore } from "@/lib/store"
import { useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Loader2, Volume2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAudioEngineRefs } from "@/lib/audio-engine"

export function AudioGenerator({ active = true, disabled = false, onGenerated }: { active?: boolean; disabled?: boolean; onGenerated?: () => void }) {
  const {
    audioGenerationStatus,
    generateTrailerAudio,
    isGeneratingAudio,
    movieTitle,
    currentScript,
  } = useStore()
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!active) audioRef.current?.pause()
  }, [active])

  const handleGenerateAudio = async () => {
    const { audioCtxRef } = getAudioEngineRefs()
    if (await generateTrailerAudio(toast, audioCtxRef)) onGenerated?.()
  }

  const downloadAudio = (blobUrl: string, filename: string) => {
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <h2 className="headline text-2xl">Give it a voice</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Narration & music</CardTitle>
          <CardDescription>Your script, a dramatic voice, and a soundtrack mixed to fit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentScript.trim() && <p className="text-sm text-muted-foreground">Generate a script in Idea, or paste your own in Script, to get started.</p>}
          <Button onClick={handleGenerateAudio} variant="skeuomorphic-primary" aria-busy={isGeneratingAudio} disabled={disabled || isGeneratingAudio || !currentScript.trim()}>
            {isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {isGeneratingAudio ? "Generating audio…" : audioGenerationStatus.status === "success" ? "Regenerate audio" : audioGenerationStatus.status === "error" ? "Retry audio" : "Generate audio"}
          </Button>
          {audioGenerationStatus.show && <p role={audioGenerationStatus.status === "error" ? "alert" : "status"} className={`text-sm leading-relaxed ${audioGenerationStatus.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{audioGenerationStatus.message}</p>}
          {audioGenerationStatus.status === "success" && audioGenerationStatus.audioUrl && (
            <div className="space-y-3">
              <audio ref={audioRef} aria-label="Generated trailer audio" controls className="w-full" src={audioGenerationStatus.audioUrl} />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    if (audioGenerationStatus.audioUrl) {
                      downloadAudio(audioGenerationStatus.audioUrl, `${movieTitle || "Untitled"}_trailer.wav`)
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-3 h-3" />
                  Download audio
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
