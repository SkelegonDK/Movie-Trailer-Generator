import { describe, test, expect, beforeAll } from "bun:test"
import { timeStretchToLength, padOrTrimToLength } from "../lib/time-stretch"

class FakeAudioBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  private channels: Float32Array[]

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels
    this.length = options.length
    this.sampleRate = options.sampleRate
    this.channels = []
    for (let i = 0; i < options.numberOfChannels; i++) this.channels.push(new Float32Array(options.length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]
  }

  copyToChannel(source: Float32Array, channel: number): void {
    this.channels[channel].set(source.subarray(0, this.length))
  }
}

function makeSineBuffer(frequency: number, durationSeconds: number, sampleRate: number, channels = 2): AudioBuffer {
  const buffer = new FakeAudioBuffer({ numberOfChannels: channels, length: Math.round(durationSeconds * sampleRate), sampleRate })
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.5
    }
  }
  return buffer as unknown as AudioBuffer
}

function measureFrequency(buffer: FakeAudioBuffer, sampleRate: number): number {
  const data = buffer.getChannelData(0)
  let crossings = 0
  let previous = data[0]
  for (let i = 1; i < data.length - 1000; i++) {
    if (previous <= 0 && data[i] > 0) crossings++
    previous = data[i]
  }
  return crossings / ((data.length - 1000) / sampleRate)
}

beforeAll(() => {
  ;(globalThis as any).AudioBuffer = FakeAudioBuffer
})

describe("timeStretchToLength", () => {
  test("compresses 3x while preserving pitch and exact length", () => {
    const sampleRate = 44100
    const source = makeSineBuffer(440, 3, sampleRate)
    const target = timeStretchToLength(source, sampleRate, 0.5)
    const result = target as unknown as FakeAudioBuffer

    expect(result.length).toBe(sampleRate)
    const freq = measureFrequency(result, sampleRate)
    expect(Math.abs(freq - 440) / 440).toBeLessThan(0.05)
  })

  test("stretches 2x while preserving pitch and exact length", () => {
    const sampleRate = 44100
    const source = makeSineBuffer(220, 2, sampleRate)
    const target = timeStretchToLength(source, sampleRate * 4, 0.5)
    const result = target as unknown as FakeAudioBuffer

    expect(result.length).toBe(sampleRate * 4)
    const freq = measureFrequency(result, sampleRate)
    expect(Math.abs(freq - 220) / 220).toBeLessThan(0.05)
  })

  test("falls back to looping for extreme stretch factors without NaN", () => {
    const sampleRate = 44100
    const source = makeSineBuffer(330, 1, sampleRate)
    const target = timeStretchToLength(source, sampleRate * 5, 1.0)
    const result = target as unknown as FakeAudioBuffer

    expect(result.length).toBe(sampleRate * 5)
    for (let i = 0; i < result.length; i++) {
      expect(Number.isFinite(result.getChannelData(0)[i])).toBe(true)
      expect(Number.isFinite(result.getChannelData(1)[i])).toBe(true)
    }
  })

  test("fades the tail out to avoid a hard cutoff", () => {
    const sampleRate = 44100
    const source = makeSineBuffer(440, 2, sampleRate)
    const target = timeStretchToLength(source, sampleRate, 1.0)
    const result = target as unknown as FakeAudioBuffer
    const data = result.getChannelData(0)
    const tailPeak = Math.max(...Array.from(data.subarray(result.length - 100)).map(Math.abs))
    expect(tailPeak).toBeLessThan(0.01)
  })
})

describe("padOrTrimToLength", () => {
  test("trims longer buffers to the exact target with a faded tail", () => {
    const sampleRate = 44100
    const source = makeSineBuffer(440, 3, sampleRate)
    const target = padOrTrimToLength(source, sampleRate, 0.5) as unknown as FakeAudioBuffer

    expect(target.length).toBe(sampleRate)
    expect(Math.abs(target.getChannelData(0)[100])).toBeGreaterThan(0)
    const tailPeak = Math.max(...Array.from(target.getChannelData(0).subarray(target.length - 100)).map(Math.abs))
    expect(tailPeak).toBeLessThan(0.01)
  })

  test("zero-pads shorter buffers", () => {
    const sampleRate = 44100
    const source = makeSineBuffer(440, 0.5, sampleRate)
    const target = padOrTrimToLength(source, sampleRate * 2, 0.5) as unknown as FakeAudioBuffer

    expect(target.length).toBe(sampleRate * 2)
    expect(target.getChannelData(0)[sampleRate * 2 - 1]).toBe(0)
  })
})
