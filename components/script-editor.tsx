"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
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
      <h2 className="headline text-2xl">Edit Script</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{movieTitle || "Untitled Movie"}</CardTitle>
          <div className="flex flex-wrap gap-1">
            {badges
              .filter(({ value }) => !!value)
              .map(({ key, value }) => (
                <Badge key={key} variant="outline" className={`text-xs ${BADGE_BG_BY_PARAM[key]}`}>
                  {value}
                </Badge>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentScript}
            onChange={(e) => setCurrentScript(e.target.value)}
            className="min-h-[400px] w-full bg-input border-border font-mono text-sm"
            aria-label="Trailer script"
          />
          <div className="mt-4">
            <Button
              onClick={handleGenerateAudio}
              variant="skeuomorphic-primary"
              disabled={!currentScript.trim() || isGeneratingAudio}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              {isGeneratingAudio ? "Generating..." : "Generate Audio"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
