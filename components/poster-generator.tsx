"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2 } from "lucide-react"
import { MoviePoster } from '@/components/ui/movie-poster'
import { useStore } from "@/lib/store"
import { generatePosterData, generateMoviePoster } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export function PosterGenerator() {
  const {
    movieTitle,
    parameters,
    currentScript,
    setPosterData,
    posterDataError,
    setPosterDataError,
    posterStatus,
    setPosterStatus,
    setPosterUrl,
  } = useStore()

  const { toast } = useToast()

  const handleGenerateMoviePoster = async () => {
    if (!currentScript.trim()) {
      toast({
        title: "No Script Available",
        description: "Please generate a script first.",
        variant: "destructive",
      })
      return
    }

    setPosterData(null)
    setPosterDataError(null)
    setPosterStatus('loading')
    setPosterUrl(null)
    toast({
      title: "Generating Movie Poster",
      description: "Creating artwork for your movie. This can take a minute.",
    })

    try {
      // Step 1: Generate poster data
      const posterDataResult = await generatePosterData({
        title: movieTitle,
        genre: parameters.genre,
        mainCharacter: parameters.character,
        setting: parameters.setting,
        conflict: parameters.conflict,
        plotTwist: parameters.plotTwist,
        script: currentScript
      })

      if (!posterDataResult.success || !posterDataResult.data) {
        const errorMsg = posterDataResult.error || "Failed to generate poster data";
        setPosterDataError(errorMsg)
        toast({
          title: "Poster Generation Failed",
          description: errorMsg,
          variant: "destructive",
        })
        setPosterStatus('idle')
        return
      }

      setPosterData(posterDataResult.data)
      // Step 2: Generate poster image
      toast({
        title: "Generating Poster Image",
        description: "Creating your movie poster via OpenRouter image generation.",
      })
      const imageResult = await generateMoviePoster(posterDataResult.data, movieTitle)
      if (!imageResult.success || !imageResult.url) {
        const errorMsg = imageResult.error || "Failed to generate poster image";
        setPosterDataError(errorMsg)
        toast({
          title: "Poster Image Generation Failed",
          description: errorMsg,
          variant: "destructive",
        })
        setPosterStatus('ready') // Allow retry
        return
      }
      setPosterUrl(imageResult.url)
      toast({
        title: "Poster Image Generated!",
        description: "Successfully generated the poster image.",
      })
      setPosterStatus('ready')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setPosterDataError(errorMsg)
      toast({
        title: "Poster Generation Failed",
        description: errorMsg,
        variant: "destructive",
      })
      setPosterStatus('idle')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="headline text-2xl">Create your poster</h2>
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm mx-auto mb-4">
            <MoviePoster />
          </div>
          <Button
            onClick={handleGenerateMoviePoster}
            variant="skeuomorphic-primary"
            aria-busy={posterStatus === 'loading'}
            disabled={!currentScript.trim() || posterStatus === 'loading'}
            className="w-full sm:w-auto"
          >
            {posterStatus === 'loading' ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {posterStatus === 'loading' ? "Creating your poster…" : "Generate poster"}
          </Button>
        </CardContent>
      </Card>

      {posterDataError && (
        <p role="alert" className="text-sm text-destructive">
          {posterDataError}
        </p>
      )}
    </div>
  )
}