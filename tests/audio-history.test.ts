import { afterEach, describe, expect, test } from "bun:test"
import { deleteAudioTrack, getSavedAudioTracks, saveAudioTrack, type AudioTrack } from "../lib/audio-utils"

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage)
  else Reflect.deleteProperty(globalThis, "sessionStorage")
})

const track: AudioTrack = {
  id: "test", title: "Trailer", url: "blob:test", duration: 12,
  timestamp: new Date("2026-09-29T12:00:00Z"), script: "Hello.", parameters: {}, backgroundMusicId: "trailer-music",
}
function setStorage(value: string, failWrite = false) {
  const storage = {
    value,
    getItem() { return this.value },
    setItem(_key: string, next: string) {
      if (failWrite) throw new Error("Quota exceeded")
      this.value = next
    },
  }
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage })
  return storage
}

describe("optional audio history", () => {
  test("storage failure does not fail completed audio generation", () => {
    setStorage("[]", true)
    expect(() => saveAudioTrack(track)).not.toThrow()
  })
  test("malformed history is replaced when saving a new track", () => {
    const storage = setStorage("{broken json")
    expect(getSavedAudioTracks()).toEqual([])
    saveAudioTrack(track)
    expect(JSON.parse(storage.value)).toHaveLength(1)
    expect(getSavedAudioTracks()).toEqual([track])
  })
  test("ignores malformed entries and restores timestamps", () => {
    setStorage(JSON.stringify([null, {}, { ...track, duration: "12" }, { ...track, timestamp: "invalid" }, track]))
    expect(getSavedAudioTracks()).toEqual([track])
  })
  test("unavailable storage does not crash reading or updating history", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() { throw new Error("Storage disabled") },
    })
    expect(getSavedAudioTracks()).toEqual([])
    expect(() => saveAudioTrack(track)).not.toThrow()
    expect(() => deleteAudioTrack(track.id)).not.toThrow()
  })
})
