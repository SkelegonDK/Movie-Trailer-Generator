"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAudioEngineRefs } from "@/lib/audio-engine"

export function AudioGenerator() {
  const {
    audioGenerationStatus,
    generateTrailerAudio,
    isGeneratingAudio,
    movieTitle,
    setAudioGenerationStatus,
  } = useStore()
  const { toast } = useToast()

  const handleGenerateAudio = () => {
    const { audioCtxRef } = getAudioEngineRefs()
    generateTrailerAudio(toast, audioCtxRef)
  }

  const downloadAudio = (blobUrl: string, filename: string) => {
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!audioGenerationStatus.show) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {audioGenerationStatus.status === "generating" && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {audioGenerationStatus.status === "success" && <div className="w-4 h-4 bg-success rounded-full" />}
          {audioGenerationStatus.status === "error" && <div className="w-4 h-4 bg-destructive rounded-full" />}
          Trailer audio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p role="status" className="text-sm text-card-foreground mb-4">{audioGenerationStatus.message}</p>
        {(() => {
          if (audioGenerationStatus.status === "success" && audioGenerationStatus.audioUrl) {
            return (
              <div className="space-y-3">
                <audio aria-label="Generated trailer audio" controls className="w-full" src={audioGenerationStatus.audioUrl} />
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
                  <Button
                    onClick={() => setAudioGenerationStatus({ show: false, status: "generating", message: "" })}
                    variant="outline"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )
          } else if (audioGenerationStatus.status === "error") {
            return (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleGenerateAudio} variant="outline" size="sm" disabled={isGeneratingAudio}>
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </Button>
                <Button
                  onClick={() => setAudioGenerationStatus({ show: false, status: "generating", message: "" })}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            )
          }
          return null
        })()}
      </CardContent>
    </Card>
  )
}
