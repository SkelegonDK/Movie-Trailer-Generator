import { describe, test, expect } from "bun:test"
import { extractNarratorText } from "../lib/audio-utils"
import {
  extractNarratorLines,
  extractCaptionLines,
  splitIntoCaptionChunks,
  buildCaptions,
  getActiveCaption,
} from "../lib/captions"

describe("extractNarratorLines", () => {
  test("extracts narrator lines in order", () => {
    const script = [
      "FADE IN:",
      "",
      "NARRATOR (V.O.)",
      "In a world where peace is a memory...",
      "",
      "RANDOM DUDE (O.S)",
      "Hey!",
      "",
      "NARRATOR (V.O.)",
      "...only one hero can save them.",
      '"Only one hero can save them."',
    ].join("\n")

    expect(extractNarratorLines(script)).toEqual([
      "In a world where peace is a memory...",
      "...only one hero can save them.",
      "Only one hero can save them.",
    ])
  })

  test("skips FADE/CUT lines after NARRATOR markers", () => {
    const script = ["NARRATOR (V.O.)", "CUT TO:", "", '"Hello."'].join("\n")
    expect(extractNarratorLines(script)).toEqual(["Hello."])
  })

  test("returns empty array for scripts without narration", () => {
    expect(extractNarratorLines("NARRATOR (V.O.)\nFADE OUT.")).toEqual([])
  })
})

describe("extractCaptionLines", () => {
  test("uses narrator extraction for screenplay-style scripts", () => {
    const script = ["NARRATOR (V.O.)", "In a world...", '"Only one hero."'].join("\n")
    expect(extractCaptionLines(script)).toEqual(["In a world...", "Only one hero."])
  })

  test("treats every meaningful line as narration in pure spoken-text scripts", () => {
    const script = [
      "They said the internet was forever...",
      "In a BROKEN world... one man fights for RELEVANCE.",
      "<pause>",
      "FADE IN:",
      "",
      "MEMECEPTION.",
    ].join("\n")
    expect(extractCaptionLines(script)).toEqual([
      "They said the internet was forever...",
      "In a BROKEN world... one man fights for RELEVANCE.",
      "MEMECEPTION.",
    ])
  })

  test("strips wrapping quotes and drops marker-only lines", () => {
    expect(extractCaptionLines('"Hello there."\n---\n<pause>')).toEqual(["Hello there."])
  })
})

describe("splitIntoCaptionChunks", () => {
  test("keeps short sentences intact", () => {
    expect(splitIntoCaptionChunks("Only one hero can save them.", 6)).toEqual([
      "Only one hero can save them.",
    ])
  })

  test("breaks long sentences into word-count chunks", () => {
    expect(splitIntoCaptionChunks("In a world where peace is a memory only one hero can save them", 6)).toEqual([
      "In a world where peace is",
      "a memory only one hero can",
      "save them",
    ])
  })

  test("splits on sentence boundaries first", () => {
    expect(splitIntoCaptionChunks("In a world. Only one hero can save them!", 6)).toEqual([
      "In a world.",
      "Only one hero can save them!",
    ])
  })
})

describe("buildCaptions", () => {
  const script = ["NARRATOR (V.O.)", "Two short words. A somewhat longer sentence here."].join("\n")

  test("covers the full duration from zero", () => {
    const captions = buildCaptions(script, 10, 6)
    expect(captions.length).toBeGreaterThan(0)
    expect(captions[0].start).toBe(0)
    expect(captions[captions.length - 1].end).toBe(10)
  })

  test("distributes time proportionally to word count", () => {
    const captions = buildCaptions("NARRATOR (V.O.)\nOne two. One two three four.", 6, 6)
    // "One two." = 2 words, "One two three four." = 4 words
    expect(captions).toHaveLength(2)
    expect(captions[0].end).toBeCloseTo(2, 5)
    expect(captions[1].start).toBeCloseTo(2, 5)
  })

  test("captions are contiguous and sorted", () => {
    const captions = buildCaptions(script, 12.5, 4)
    for (let i = 1; i < captions.length; i++) {
      expect(captions[i].start).toBeCloseTo(captions[i - 1].end, 5)
      expect(captions[i].start).toBeGreaterThanOrEqual(captions[i - 1].start)
    }
  })

  test("respects maxWords when chunking", () => {
    const captions = buildCaptions(
      "NARRATOR (V.O.)\nIn a world where peace is a memory only one hero can save them.",
      10,
      4,
    )
    for (const caption of captions) {
      expect(caption.text.split(/\s+/).length).toBeLessThanOrEqual(4)
    }
  })

  test("returns empty array for zero duration or no narration", () => {
    expect(buildCaptions(script, 0, 6)).toEqual([])
  })

  test("builds captions for pure spoken-text scripts", () => {
    const spokenScript = ["One two.", "One two three four.", "<pause>"].join("\n")
    const captions = buildCaptions(spokenScript, 6, 6)
    expect(captions).toHaveLength(2)
    expect(captions[0].text).toBe("One two.")
    expect(captions[1].end).toBe(6)
  })
})

describe("getActiveCaption", () => {
  const captions = buildCaptions("NARRATOR (V.O.)\nOne two. One two three four.", 6, 6)

  test("returns the caption active at a given time", () => {
    const active = getActiveCaption(captions, 1)
    expect(active?.text).toBe("One two.")
  })

  test("returns null outside of all captions", () => {
    expect(getActiveCaption(captions, -1)).toBeNull()
    expect(getActiveCaption(captions, 10)).toBeNull()
  })
})


describe("narration regressions", () => {
  test("keeps unquoted spoken text alongside quoted lines", () => {
    expect(extractCaptionLines('In a world.\n"One hero."\nComing soon.')).toEqual([
      "In a world.", "One hero.", "Coming soon.",
    ])
  })
  test("does not duplicate quoted narration following a marker", () => {
    expect(extractNarratorLines('NARRATOR (V.O.)\n"One hero."')).toEqual(["One hero."])
  })
  test("repeated narrator markers use their own following line", () => {
    expect(extractNarratorText("NARRATOR (V.O.)\nFirst line.\nNARRATOR (V.O.)\nSecond line.")).toBe(
      "First line. ... Second line.",
    )
  })
})
