"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function ScriptEditor({ disabled = false }: { disabled?: boolean }) {
  const { currentScript, setCurrentScript } = useStore()

  return (
    <div className="space-y-6">
      <h2 className="headline text-2xl">Edit script</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trailer script</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">Paste your own script or fine-tune the drama, then choose Next to create your narration and music.</p>
        </CardHeader>
        <CardContent>
          <Textarea
            disabled={disabled}
            value={currentScript}
            onChange={(e) => setCurrentScript(e.target.value)}
            placeholder="Your generated script appears here. You can also paste your own and make it as dramatic—or ridiculous—as you like."
            className="min-h-64 sm:min-h-[400px] w-full resize-y bg-input border-border font-mono text-base leading-relaxed md:text-sm"
            aria-label="Trailer script"
          />
        </CardContent>
      </Card>
    </div>
  )
}
