import { describe, expect, it } from "bun:test"
import { getWorkflowAccess } from "../lib/workflow"

const empty = { currentScript: "", trailerAudioBuffer: null, posterUrl: null, posterStatus: "idle" as const }

describe("workflow asset requirements", () => {
  it("allows an empty Script editor while keeping generation stages locked", () => {
    expect(getWorkflowAccess(empty)).toEqual({ idea: true, script: true, audio: false, poster: false, video: false })
    expect(getWorkflowAccess({ ...empty, currentScript: "  " })).toEqual({ idea: true, script: true, audio: false, poster: false, video: false })
  })

  it("unlocks stages only as all prerequisites become available", () => {
    const script = { ...empty, currentScript: "A trailer script" }
    expect(getWorkflowAccess(script)).toEqual({ idea: true, script: true, audio: true, poster: false, video: false })
    const audio = { ...script, trailerAudioBuffer: {} }
    expect(getWorkflowAccess(audio).poster).toBe(true)
    expect(getWorkflowAccess(audio).video).toBe(false)
    const poster = { ...audio, posterUrl: "blob:poster", posterStatus: "ready" as const }
    expect(getWorkflowAccess(poster).video).toBe(true)
    expect(getWorkflowAccess({ ...poster, posterStatus: "loading" }).video).toBe(false)
    expect(getWorkflowAccess({ ...poster, trailerAudioBuffer: null }).video).toBe(false)
    expect(getWorkflowAccess({ ...poster, currentScript: "" }).poster).toBe(false)
  })
})
