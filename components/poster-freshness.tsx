"use client"

import { useStore } from "@/lib/store"
import { getPosterSource } from "@/lib/poster-source"
import { Button } from "@/components/ui/button"

export function PosterFreshness({ disabled = false }: { disabled?: boolean }) {
  const state = useStore()
  const source = getPosterSource(state)
  if (!state.posterUrl || state.posterSource === source) return null
  const accepted = state.posterReuseSource === source
  return (
    <div role="status" className="w-full space-y-3 rounded-md border p-4 text-sm">
      <p>{accepted ? "Using your existing artwork for this version." : "Your story or title has changed since this poster was created. Review the artwork before exporting."}</p>
      <p className="text-muted-foreground">You can regenerate it in Poster. Your saved artwork stays in Library.</p>
      {!accepted && <Button variant="outline" disabled={disabled} onClick={state.acceptPosterReuse}>Use existing artwork</Button>}
    </div>
  )
}
