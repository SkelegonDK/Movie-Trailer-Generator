"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Volume2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAudioEngineRefs } from "@/lib/audio-engine"

const BADGE_BG_BY_PARAM = {
  genre: "bg-card-genre-bg",
  setting: "bg-card-setting-bg",
  character: "bg-card-character-bg",
  conflict: "bg-card-conflict-bg",
  plotTwist: "bg-card-plot-twist-bg",
} as const

export function ScriptEditor() {
  const {
    movieTitle,
    parameters,
    currentScript,
    setCurrentScript,
    isGeneratingAudio,
    generateTrailerAudio,
  } = useStore()
  const { toast } = useToast()

  const handleGenerateAudio = () => {
    const { audioCtxRef } = getAudioEngineRefs()
    generateTrailerAudio(toast, audioCtxRef)
  }

  const badges: { key: keyof typeof BADGE_BG_BY_PARAM; value: string }[] = [
    { key: "genre", value: parameters.genre },
    { key: "setting", value: parameters.setting },
    { key: "character", value: parameters.character },
    { key: "conflict", value: parameters.conflict },
    { key: "plotTwist", value: parameters.plotTwist },
  ]

  return (
    <div className="space-y-6">
      <h2 className="headline text-2xl">Edit script</h2>

      <Card>
        <CardHeader>
          <CardTitle className="break-words text-lg">{movieTitle || "Your movie title"}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {badges
              .filter(({ value }) => !!value)
              .map(({ key, value }) => (
                <Badge key={key} variant="outline" className={`max-w-full whitespace-normal break-words text-sm font-normal ${BADGE_BG_BY_PARAM[key]}`}>
                  {value}
                </Badge>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentScript}
            onChange={(e) => setCurrentScript(e.target.value)}
            placeholder="Your generated script appears here. You can also paste your own and make it as dramatic—or ridiculous—as you like."
            className="min-h-64 sm:min-h-[400px] w-full resize-y bg-input border-border font-mono text-base leading-relaxed md:text-sm"
            aria-label="Trailer script"
          />
          <div className="mt-4">
            <Button
              onClick={handleGenerateAudio}
              variant="skeuomorphic-primary"
              aria-busy={isGeneratingAudio}
              disabled={!currentScript.trim() || isGeneratingAudio}
            >
              {isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              {isGeneratingAudio ? "Generating audio…" : "Generate audio"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
