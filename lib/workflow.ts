export const WORKFLOW_STEPS = ["idea", "script", "audio", "poster", "video"] as const
export type WorkflowStep = typeof WORKFLOW_STEPS[number]

interface WorkflowAssets {
  currentScript: string
  trailerAudioBuffer: unknown | null
  posterUrl: string | null
  posterStatus: "idle" | "loading" | "ready"
}

export function getWorkflowAccess(assets: WorkflowAssets): Record<WorkflowStep, boolean> {
  const scriptReady = !!assets.currentScript.trim()
  const audioReady = scriptReady && !!assets.trailerAudioBuffer
  return {
    idea: true,
    script: scriptReady,
    audio: scriptReady,
    poster: audioReady,
    video: audioReady && !!assets.posterUrl && assets.posterStatus === "ready",
  }
}
