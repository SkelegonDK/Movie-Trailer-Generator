import type { MutableRefObject } from "react"

const audioCtxRef: MutableRefObject<AudioContext | null> = { current: null }

export function getAudioEngineRefs() {
  return {
    audioCtxRef,
  }
}
