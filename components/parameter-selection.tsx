"use client"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shuffle, Wand2, HelpCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PARAMETER_MODES, type ParameterMode } from "@/lib/parameter-modes"
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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ParameterSelection({ disabled = false, onGenerated }: { disabled?: boolean; onGenerated?: () => void }) {
  const {
    parameters,
    setParameters,
    movieTitle,
    setMovieTitle,
    isGenerating,
    mode,
    setMode,
    generateScript,
    customContextEnabled,
    setCustomContextEnabled,
    customContext,
    setCustomContext,
    isProcessingContext,
    contextFieldsVisible,
    processCustomContext,
  } = useStore()
  const { toast } = useToast()
  const source = PARAMETER_MODES[mode].parameters

  const handleRandomizeAll = () => {
    if (!source) return
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
    if (!source) return
    const options = source[param]
    setParameters({ ...parameters, [param]: options[Math.floor(Math.random() * options.length)] })
  }

  const handleGenerateScript = async () => {
    if (await generateScript(toast)) onGenerated?.()
  }

  const getOptionsFor = (param: keyof typeof parameters) => {
    return source?.[param] ?? []
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div className="space-y-2">
          <p className="studio-eyebrow text-muted-foreground">01 / The concept</p>
          <h2 className="headline text-2xl">Start with an idea.</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Set the scene. We’ll take care of the drama.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-11 items-center gap-3">
            <Label htmlFor="custom-context-toggle" className="flex min-h-11 cursor-pointer items-center text-sm">Custom context</Label>
            <Switch
              id="custom-context-toggle"
              aria-label="Custom context"
              checked={customContextEnabled}
              onCheckedChange={setCustomContextEnabled}
              disabled={disabled || isProcessingContext || isGenerating}
              aria-controls="custom-context-panel"
            />
          </div>
          {!customContextEnabled && (<>
          <Select disabled={disabled || isGenerating} value={mode} onValueChange={value => setMode(value as ParameterMode)}>
            <SelectTrigger className="w-[180px]" aria-label="Parameter mode">
              <SelectValue placeholder="Choose mode" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PARAMETER_MODES).map(([id, config]) => (
                <SelectItem key={id} value={id}>{config.label}</SelectItem>
              ))}
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
                <DialogTitle>Parameter modes</DialogTitle>
                <DialogDescription>
                  Choose how parameters are generated.
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                {Object.entries(PARAMETER_MODES).map(([id, config]) => (
                  <div key={id}>
                    <dt className="font-semibold">{config.label}</dt>
                    <dd className="text-muted-foreground">{config.description}</dd>
                  </div>
                ))}
              </dl>
            </DialogContent>
          </Dialog>
          </>)}
        </div>
      </div>

      {customContextEnabled && (
        <Card id="custom-context-panel">
          <CardHeader>
            <CardTitle><Label htmlFor="custom-context" className="text-lg font-semibold">Custom context</Label></CardTitle>
            <p id="custom-context-description" className="text-sm text-muted-foreground">
              Describe your movie idea. Process it to fill in the fields, then review or tweak them before generating a script.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              id="custom-context"
              disabled={disabled || isProcessingContext || isGenerating}
              value={customContext}
              onChange={event => setCustomContext(event.target.value)}
              placeholder="For example: Set the story in Copenhagen, with dry humor and an unlikely friendship."
              aria-describedby="custom-context-description"
              className="min-h-[120px]"
            />
            <Button
              onClick={() => processCustomContext(toast)}
              variant="skeuomorphic-primary"
              aria-busy={isProcessingContext}
              disabled={disabled || isProcessingContext || isGenerating || !customContext.trim()}
            >
              {isProcessingContext ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {isProcessingContext ? "Processing context…" : contextFieldsVisible ? "Update fields" : "Use this idea"}
            </Button>
          </CardContent>
        </Card>
      )}

      {(!customContextEnabled || contextFieldsVisible) && (<>
      <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-x-6 gap-y-5 border-t pt-5">
        <ParameterCard
          title="Genre"
          value={parameters.genre}
          options={getOptionsFor("genre")}
          disabled={disabled}
          mode={customContextEnabled ? "custom" : mode}
          onValueChange={(value) => setParameters({ ...parameters, genre: value })}
          onRandomize={() => handleRandomizeParameter("genre")}
        />
        <ParameterCard
          title="Setting"
          value={parameters.setting}
          options={getOptionsFor("setting")}
          disabled={disabled}
          mode={customContextEnabled ? "custom" : mode}
          onValueChange={(value) => setParameters({ ...parameters, setting: value })}
          onRandomize={() => handleRandomizeParameter("setting")}
        />
        <ParameterCard
          title="Main character"
          value={parameters.character}
          options={getOptionsFor("character")}
          disabled={disabled}
          mode={customContextEnabled ? "custom" : mode}
          onValueChange={(value) => setParameters({ ...parameters, character: value })}
          onRandomize={() => handleRandomizeParameter("character")}
        />
        <ParameterCard
          title="Conflict"
          value={parameters.conflict}
          options={getOptionsFor("conflict")}
          disabled={disabled}
          mode={customContextEnabled ? "custom" : mode}
          onValueChange={(value) => setParameters({ ...parameters, conflict: value })}
          onRandomize={() => handleRandomizeParameter("conflict")}
        />
        <ParameterCard
          title="Plot twist"
          value={parameters.plotTwist}
          options={getOptionsFor("plotTwist")}
          disabled={disabled}
          mode={customContextEnabled ? "custom" : mode}
          onValueChange={(value) => setParameters({ ...parameters, plotTwist: value })}
          onRandomize={() => handleRandomizeParameter("plotTwist")}
        />
        <Card className="parameter-field">
          <CardHeader className="flex-row items-center justify-between px-0 pt-0 pb-2 sm:px-0 sm:pt-0 sm:pb-2">
            <CardTitle className="flex min-h-11 items-center text-sm font-medium"><Label htmlFor="movie-title">Movie title</Label></CardTitle>
            <span className="text-xs text-muted-foreground">Optional</span>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0 sm:pb-0">
            <Input
              id="movie-title"
              disabled={disabled}
              value={movieTitle}
              onChange={e => setMovieTitle(e.target.value)}
              placeholder="Leave blank for a surprise"
              aria-label="Movie title"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end">
        {!customContextEnabled && <Button onClick={handleRandomizeAll} variant="skeuomorphic-secondary" disabled={disabled || isGenerating || mode === 'custom'}>
          <Shuffle className="w-4 h-4" />
          Randomize all
        </Button>}
        <Button onClick={handleGenerateScript} variant="skeuomorphic-primary" aria-busy={isGenerating} disabled={disabled || isGenerating}>
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {isGenerating ? "Writing your script…" : "Generate script"}
        </Button>
      </div>
      </>)}
    </div>
  )
}
