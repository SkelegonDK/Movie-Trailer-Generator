/**
 * Time-stretching utilities for background music.
 *
 * The stretcher uses WSOLA (Waveform Similarity Overlap-Add). WSOLA stretches
 * or compresses audio in the time domain by repeating or skipping short,
 * highly-correlated frames instead of resampling, so the pitch and formants
 * of the source material are approximately preserved.
 */

/** Tempo (input length / output length) bounds beyond which WSOLA artifacts become noticeable. */
const MIN_TEMPO = 0.5
const MAX_TEMPO = 2.0

/** WSOLA frame length in samples (~46ms at 44.1kHz). */
const FRAME_SIZE = 2048
/** Synthesis hop: frames overlap by 50%, which makes the periodic Hann window sum to 1. */
const SYNTHESIS_HOP = FRAME_SIZE >> 1
/** Search range for aligning each new frame with the previous one. */
const TOLERANCE = 256
/** Correlation is computed on every Nth sample for performance. */
const CORRELATION_STRIDE = 4

function createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
  return new AudioBuffer({ numberOfChannels, length, sampleRate })
}

function periodicHann(size: number): Float32Array {
  const win = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / size))
  }
  return win
}

function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]
  const length = channels[0].length
  const mono = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (const channel of channels) sum += channel[i]
    mono[i] = sum / channels.length
  }
  return mono
}

/**
 * WSOLA time-stretcher. Returns `numChannels` output arrays of exactly
 * `targetLengthSamples`, with the input mapped through `tempo`
 * (tempo > 1 compresses, tempo < 1 stretches). Pitch and formants are approximately preserved.
 */
function wsolaStretch(channels: Float32Array[], tempo: number, targetLengthSamples: number): Float32Array[] {
  const numChannels = channels.length
  const inputLength = channels[0].length
  const analysisHop = Math.max(1, Math.round(SYNTHESIS_HOP * tempo))
  const window = periodicHann(FRAME_SIZE)
  const mono = downmixToMono(channels)

  const out: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) out.push(new Float32Array(targetLengthSamples))
  const windowSum = new Float32Array(targetLengthSamples)

  let outputPos = 0
  let inputPos = 0
  let delta = 0

  while (outputPos < targetLengthSamples && inputPos < inputLength) {
    // Align the incoming frame with the audio already written to the output
    // overlap region, searching around the nominal position for the best match.
    if (outputPos > 0) {
      delta = findBestDelta(mono, out[0], inputPos, outputPos, inputLength, targetLengthSamples)
    }

    // Copy the frame into the output with overlap-add.
    const frameStart = inputPos + delta
    for (let i = 0; i < FRAME_SIZE; i++) {
      const outIndex = outputPos + i
      if (outIndex >= targetLengthSamples) break
      const readIndex = frameStart + i
      const sample = readIndex >= 0 && readIndex < inputLength ? readIndex : -1
      if (sample === -1) continue
      for (let ch = 0; ch < numChannels; ch++) {
        out[ch][outIndex] += channels[ch][readIndex] * window[i]
      }
      windowSum[outIndex] += window[i]
    }

    outputPos += SYNTHESIS_HOP
    inputPos += analysisHop
  }

  // Normalize by the accumulated window sum so the overlap-add is seamless.
  for (let ch = 0; ch < numChannels; ch++) {
    const channelOut = out[ch]
    for (let i = 0; i < targetLengthSamples; i++) {
      if (windowSum[i] > 1e-6) channelOut[i] /= windowSum[i]
    }
  }

  return out
}

/**
 * Searches for the WSOLA alignment delta that best matches the incoming
 * analysis frame against the audio already present in the output overlap
 * region of the first output channel. The input uses a mono downmix and
 * the chosen delta is shared by all channels.
 */
function findBestDelta(
  mono: Float32Array,
  output: Float32Array,
  nominal: number,
  outputPos: number,
  inputLength: number,
  targetLengthSamples: number
): number {
  const minDelta = Math.max(-TOLERANCE, -nominal)
  const maxDelta = Math.min(TOLERANCE, inputLength - FRAME_SIZE - nominal)
  if (maxDelta <= minDelta) return 0

  let bestDelta = 0
  let bestScore = Infinity
  for (let d = minDelta; d <= maxDelta; d++) {
    let score = 0
    for (let i = 0; i < FRAME_SIZE - SYNTHESIS_HOP; i += CORRELATION_STRIDE) {
      const outIndex = outputPos + i
      if (outIndex >= targetLengthSamples) break
      const diff = output[outIndex] - mono[nominal + d + i]
      score += diff * diff
    }
    if (score < bestScore) {
      bestScore = score
      bestDelta = d
    }
  }
  return bestDelta
}

function applyFadeOut(channels: Float32Array[], length: number, fadeSeconds: number, sampleRate: number): void {
  const fadeSamples = Math.min(length, Math.round(fadeSeconds * sampleRate))
  const fadeStart = length - fadeSamples
  for (const channel of channels) {
    for (let i = fadeStart; i < length; i++) {
      channel[i] *= (length - i) / fadeSamples
    }
  }
}

/**
 * Stretches or compresses a buffer's channel data to exactly
 * `targetLengthSamples`, preserving pitch and formants. The tail fades out
 * smoothly so the result never ends in a hard cutoff.
 */
export function timeStretchToLength(
  buffer: AudioBuffer,
  targetLengthSamples: number,
  fadeOutSeconds: number
): AudioBuffer {
  const inputLength = buffer.length
  const tempo = inputLength / targetLengthSamples

  let channels: Float32Array[] = []
  if (tempo >= MIN_TEMPO && tempo <= MAX_TEMPO) {
    const source: Float32Array[] = []
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) source.push(buffer.getChannelData(ch))
    channels = wsolaStretch(source, tempo, targetLengthSamples)
  } else {
    // Outside the comfortable WSOLA range: fall back to looping (short music)
    // and trim the result, both of which preserve pitch by construction.
    channels = loopChannelsToLength(buffer, targetLengthSamples)
  }

  applyFadeOut(channels, targetLengthSamples, fadeOutSeconds, buffer.sampleRate)

  const result = createBuffer(buffer.numberOfChannels, targetLengthSamples, buffer.sampleRate)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) result.copyToChannel(channels[ch] as Float32Array<ArrayBuffer>, ch)
  return result
}

/**
 * Fills `targetLengthSamples` by repeating the source material with a
 * crossfade between repetitions, then trims any excess. Pitch is untouched.
 */
function loopChannelsToLength(buffer: AudioBuffer, targetLengthSamples: number): Float32Array[] {
  const sourceLength = buffer.length
  const numChannels = buffer.numberOfChannels
  const crossfade = Math.min(Math.floor(sourceLength / 2), Math.round(0.5 * buffer.sampleRate))
  const out: Float32Array[] = []
  const source: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    source.push(buffer.getChannelData(ch))
    out.push(new Float32Array(targetLengthSamples))
  }

  for (let ch = 0; ch < numChannels; ch++) {
    const src = source[ch]
    const dst = out[ch]
    const firstCopy = Math.min(sourceLength, targetLengthSamples)
    dst.set(src.subarray(0, firstCopy))

    let writePos = sourceLength - crossfade
    while (writePos < targetLengthSamples) {
      const chunkLength = Math.min(sourceLength, targetLengthSamples - writePos)
      for (let i = 0; i < chunkLength; i++) {
        const index = writePos + i
        if (i < crossfade) {
          const t = i / crossfade
          dst[index] = dst[index] * (1 - t) + src[i] * t
        } else {
          dst[index] = src[i]
        }
      }
      writePos += sourceLength - crossfade
    }
  }

  return out
}

/**
 * Copies a buffer, trimming or zero-padding it to exactly
 * `targetLengthSamples`, with a fade-out on the tail.
 */
export function padOrTrimToLength(
  buffer: AudioBuffer,
  targetLengthSamples: number,
  fadeOutSeconds: number
): AudioBuffer {
  const result = createBuffer(buffer.numberOfChannels, targetLengthSamples, buffer.sampleRate)
  const copyLength = Math.min(buffer.length, targetLengthSamples)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const channelOut = new Float32Array(targetLengthSamples)
    channelOut.set(buffer.getChannelData(ch).subarray(0, copyLength))
    result.copyToChannel(channelOut, ch)
  }
  const channels: Float32Array[] = []
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) channels.push(result.getChannelData(ch))
  applyFadeOut(channels, targetLengthSamples, fadeOutSeconds, buffer.sampleRate)
  return result
}

/**
 * Resamples a buffer to a new sample rate using an OfflineAudioContext.
 */
export async function resampleAudioBuffer(buffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetSampleRate) return buffer
  const length = Math.ceil((buffer.length * targetSampleRate) / buffer.sampleRate)
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, length, targetSampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
  return await ctx.startRendering()
}

/**
 * Prepares the background music to match the voiceover exactly:
 *
 * 1. Resamples the music to the voiceover's sample rate.
 * 2. If the lengths are already within tolerance, trims/pads to the exact
 *    voiceover sample count.
 * 3. Otherwise time-stretches the music (WSOLA, pitch and formants preserved)
 *    to the exact voiceover sample count.
 *
 * The result always ends with a fade-out so nothing is cut off abruptly.
 */
export async function stretchMusicToVoiceover(
  musicBuffer: AudioBuffer,
  voiceoverSampleRate: number,
  voiceoverLengthSamples: number,
  fadeOutSeconds: number = 1.5
): Promise<AudioBuffer> {
  if (voiceoverLengthSamples <= 0) return musicBuffer

  const music = await resampleAudioBuffer(musicBuffer, voiceoverSampleRate)
  if (Math.abs(music.length - voiceoverLengthSamples) <= Math.round(0.02 * voiceoverLengthSamples)) {
    return padOrTrimToLength(music, voiceoverLengthSamples, fadeOutSeconds)
  }
  return timeStretchToLength(music, voiceoverLengthSamples, fadeOutSeconds)
}
