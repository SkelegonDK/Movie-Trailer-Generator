"use client"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shuffle, Wand2, HelpCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import hollywoodParameters from "../assets/hollywood-parameters.json"
import stupidParameters from "../assets/stupid-parameters.json"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ParameterCard } from "@/components/ui/parameter-card"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ParameterSelection() {
  const {
    parameters,
    setParameters,
    movieTitle,
    setMovieTitle,
    isGenerating,
    mode,
    setMode,
    generateScript,
  } = useStore()
  const { toast } = useToast()

  const handleRandomizeAll = () => {
    const source = mode === "hollywood" ? hollywoodParameters : stupidParameters
    const randomParameters = {
      genre: source.genre[Math.floor(Math.random() * source.genre.length)],
      setting: source.setting[Math.floor(Math.random() * source.setting.length)],
      character: source.character[Math.floor(Math.random() * source.character.length)],
      conflict: source.conflict[Math.floor(Math.random() * source.conflict.length)],
      plotTwist: source.plotTwist[Math.floor(Math.random() * source.plotTwist.length)],
    }
    setParameters(randomParameters)
    setMovieTitle("") // Clear title when randomizing
  }

  const handleRandomizeParameter = (param: keyof typeof parameters) => {
    const source = mode === "hollywood" ? hollywoodParameters : stupidParameters
    const options = {
      genre: source.genre,
      setting: source.setting,
      character: source.character,
      conflict: source.conflict,
      plotTwist: source.plotTwist,
    }
    setParameters({ ...parameters, [param]: options[param][Math.floor(Math.random() * options[param].length)] })
  }

  const handleGenerateScript = () => {
    generateScript(toast)
  }

  const getOptionsFor = (param: keyof typeof parameters) => {
    const source = mode === "hollywood" ? hollywoodParameters : stupidParameters
    const options = {
      genre: source.genre,
      setting: source.setting,
      character: source.character,
      conflict: source.conflict,
      plotTwist: source.plotTwist,
    }
    return options[param]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="headline text-2xl">Create Your Trailer</h2>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={value => setMode(value as "hollywood" | "stupid" | "custom")}>
            <SelectTrigger className="w-[180px]" aria-label="Parameter mode">
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hollywood">Hollywood</SelectItem>
              <SelectItem value="stupid">Stupid</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="About parameter modes">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Parameter Modes</DialogTitle>
                <DialogDescription>
                  Choose how parameters are generated.
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold">Hollywood</dt>
                  <dd className="text-muted-foreground">Generates more conventional, but still funny, trailer ideas.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Stupid</dt>
                  <dd className="text-muted-foreground">Generates completely absurd and nonsensical ideas for maximum humor.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Custom</dt>
                  <dd className="text-muted-foreground">Lets you write your own parameters from scratch.</dd>
                </div>
              </dl>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ParameterCard
          title="Genre"
          value={parameters.genre}
          options={getOptionsFor("genre")}
          mode={mode}
          onValueChange={(value) => setParameters({ ...parameters, genre: value })}
          onRandomize={() => handleRandomizeParameter("genre")}
        />
        <ParameterCard
          title="Setting"
          value={parameters.setting}
          options={getOptionsFor("setting")}
          mode={mode}
          onValueChange={(value) => setParameters({ ...parameters, setting: value })}
          onRandomize={() => handleRandomizeParameter("setting")}
        />
        <ParameterCard
          title="Main Character"
          value={parameters.character}
          options={getOptionsFor("character")}
          mode={mode}
          onValueChange={(value) => setParameters({ ...parameters, character: value })}
          onRandomize={() => handleRandomizeParameter("character")}
        />
        <ParameterCard
          title="The Conflict"
          value={parameters.conflict}
          options={getOptionsFor("conflict")}
          mode={mode}
          onValueChange={(value) => setParameters({ ...parameters, conflict: value })}
          onRandomize={() => handleRandomizeParameter("conflict")}
        />
        <ParameterCard
          title="The Plot Twist"
          value={parameters.plotTwist}
          options={getOptionsFor("plotTwist")}
          mode={mode}
          onValueChange={(value) => setParameters({ ...parameters, plotTwist: value })}
          onRandomize={() => handleRandomizeParameter("plotTwist")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Movie Title (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={movieTitle}
              onChange={e => setMovieTitle(e.target.value)}
              placeholder="AI will generate if empty"
              aria-label="Movie title"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleRandomizeAll} variant="skeuomorphic-secondary" disabled={isGenerating || mode === 'custom'}>
          <Shuffle className="w-4 h-4 mr-2" />
          Randomize All
        </Button>
        <Button onClick={handleGenerateScript} variant="skeuomorphic-primary" disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          Generate Script
        </Button>
      </div>
    </div>
  )
}
