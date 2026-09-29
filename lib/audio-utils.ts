import { extractNarratorLines } from "./captions"

/**
 * Extracts narrator voiceover lines from a movie script.
 * It looks for lines marked with "NARRATOR (V.O.)" or direct quoted narration.
 * @param {string} script - The movie script text.
 * @returns {string} A single string containing all concatenated narrator lines, separated by " ... ".
 * @example
 * const script = `\nNARRATOR (V.O.)\nIn a world...\n\nRANDOM DUDE (O.S)\nHey!\n\nNARRATOR (V.O.)\n...where peace is a memory.\n"Only one hero can save them."\n`;
 * const narration = extractNarratorText(script);
 * // narration would be: "In a world... ... ...where peace is a memory. ... Only one hero can save them."
 * // Note: The example output might slightly differ based on exact line break handling, this illustrates the concept.
 */
export function extractNarratorText(script: string): string {
  return extractNarratorLines(script).join(" ... ")
}

/**
 * Creates a Blob URL from an ArrayBuffer containing audio data.
 * @param {ArrayBuffer} arrayBuffer - The audio data.
 * @returns {string} A Blob URL representing the audio data, suitable for use in an <audio> element.
 * @example
 * // Assuming `audioData` is an ArrayBuffer from an API or file
 * const audioUrl = createAudioBlob(audioData);
 * const audioElement = new Audio(audioUrl);
 * audioElement.play();
 */
export function createAudioBlob(arrayBuffer: ArrayBuffer): string {
  const blob = new Blob([arrayBuffer], { type: "audio/wav" })
  return URL.createObjectURL(blob)
}

/**
 * Triggers a browser download for the given audio URL.
 * @param {string} audioUrl - The URL of the audio file to download (e.g., a Blob URL).
 * @param {string} filename - The desired filename for the downloaded file.
 * @example
 * // Assuming `myAudioBlobUrl` is a Blob URL created from audio data
 * downloadAudio(myAudioBlobUrl, "trailer_audio.wav");
 */
export function downloadAudio(audioUrl: string, filename: string): void {
  const link = document.createElement("a")
  link.href = audioUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Formats a duration in seconds into a mm:ss string.
 * @param {number} seconds - The duration in seconds.
 * @returns {string} The formatted duration string (e.g., "2:35").
 * @example
 * const duration1 = formatDuration(155); // "2:35"
 * const duration2 = formatDuration(59);  // "0:59"
 * const duration3 = formatDuration(0);   // "0:00"
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

/**
 * Interface representing a generated audio track's metadata.
 */
export interface AudioTrack {
  /** Unique identifier for the track. */
  id: string
  /** Title of the movie/trailer. */
  title: string
  /** Duration of the audio track in seconds. */
  duration: number
  /** Blob URL for the audio track. */
  url: string
  /** Timestamp of when the track was generated. */
  timestamp: Date
  /** The script used to generate the voiceover. */
  script: string
  /** Parameters used for generating the title and script. */
  parameters: any
  /** Identifier for the background music used. */
  backgroundMusicId: string
}

/**
 * Saves an audio track's metadata to sessionStorage.
 * Keeps a maximum of 20 tracks, with the newest first. Storage failures are ignored.
 * @param {AudioTrack} track - The audio track metadata to save.
 * @example
 * const newTrack: AudioTrack = {
 *   id: new Date().toISOString(),
 *   title: "My Awesome Trailer",
 *   duration: 125.5,
 *   url: "blob:http://localhost:3000/some-uuid",
 *   timestamp: new Date(),
 *   script: "NARRATOR (V.O.)\nIn a world...",
 *   parameters: { genre: "Action" },
 *   backgroundMusicId: "trailer-music"
 * };
 * saveAudioTrack(newTrack);
 */
export function saveAudioTrack(track: AudioTrack): void {
  // History is optional: a storage failure must not discard generated audio.
  try {
    const tracks = [track, ...getSavedAudioTracks()].slice(0, 20)
    sessionStorage.setItem("generated-audio-tracks", JSON.stringify(tracks))
  } catch {
    // The current audio remains playable when storage is full or unavailable.
  }
}

/**
 * Retrieves all saved audio track metadata from sessionStorage.
 * @returns {AudioTrack[]} Valid saved tracks with Date timestamps, or an empty array when storage is unavailable.
 * @example
 * const allTracks = getSavedAudioTracks();
 * if (allTracks.length > 0) {
 *   console.log(`Found ${allTracks.length} saved tracks. Latest: ${allTracks[0].title}`);
 * }
 */
export function getSavedAudioTracks(): AudioTrack[] {
  try {
    const savedTracks: unknown = JSON.parse(sessionStorage.getItem("generated-audio-tracks") ?? "[]")
    if (!Array.isArray(savedTracks)) return []
    return savedTracks.flatMap((track) => {
      if (
        !track || typeof track !== "object" ||
        typeof track.id !== "string" || typeof track.title !== "string" ||
        typeof track.url !== "string" || typeof track.script !== "string" ||
        typeof track.backgroundMusicId !== "string" ||
        typeof track.duration !== "number" || !Number.isFinite(track.duration) || track.duration < 0 ||
        typeof track.timestamp !== "string"
      ) return []
      const timestamp = new Date(track.timestamp)
      return Number.isFinite(timestamp.getTime()) ? [{ ...track, timestamp } as AudioTrack] : []
    })
  } catch {
    return []
  }
}

/**
 * Deletes an audio track from sessionStorage by its ID.
 * @param {string} id - The ID of the audio track to delete.
 * @example
 * deleteAudioTrack("some-track-id");
 */
export function deleteAudioTrack(id: string): void {
  try {
    const tracks = getSavedAudioTracks().filter((track) => track.id !== id)
    sessionStorage.setItem("generated-audio-tracks", JSON.stringify(tracks))
  } catch {
    // Storage can be disabled independently of audio playback.
  }
}

/**
 * Converts an AudioBuffer object into a WAV audio format ArrayBuffer.
 * This is useful for creating a downloadable WAV file from Web Audio API processed audio.
 * @param {AudioBuffer} audioBuffer - The AudioBuffer to convert.
 * @returns {ArrayBuffer} An ArrayBuffer containing the audio data in WAV format.
 * @example
 * // Assuming `myAudioContext` is an AudioContext and `decodedAudioData` is an AudioBuffer
 * // const myAudioContext = new AudioContext();
 * // const decodedAudioData = await myAudioContext.decodeAudioData(someArrayBuffer);
 * const wavArrayBuffer = convertAudioBufferToWavArrayBuffer(decodedAudioData);
 * // Now wavArrayBuffer can be used to create a Blob for download
 */
export function convertAudioBufferToWavArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bitsPerSample = 16; // Standard for WAV
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize); // 44 bytes for header
  const view = new DataView(buffer);

  // Helper function to write strings to DataView
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write PCM data
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i])); // Clamp to [-1, 1]
      // Convert to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return buffer;
}

/**
 * Stitches a voiceover AudioBuffer together with a background music
 * AudioBuffer. The mixed output is exactly as long as the voiceover (sample
 * for sample), and the music fades out over the final stretch so nothing is
 * cut off abruptly.
 * @param {AudioBuffer} voiceoverAudioBuffer - The voiceover audio buffer. Defines the final length.
 * @param {AudioBuffer} musicAudioBuffer - The background music audio buffer. Should already be stretched to the voiceover's length.
 * @param {number} musicVolume - The gain for the background music (0.0 to 1.0, e.g., 0.5).
 * @returns {Promise<AudioBuffer>} The mixed audio buffer, exactly the voiceover's duration.
 */
export async function mixVoiceoverAndMusic(
  voiceoverAudioBuffer: AudioBuffer,
  musicAudioBuffer: AudioBuffer,
  musicVolume: number = 0.5
): Promise<AudioBuffer> {
  const mixedChannels = Math.max(voiceoverAudioBuffer.numberOfChannels, musicAudioBuffer.numberOfChannels);
  const mixedSampleRate = Math.max(voiceoverAudioBuffer.sampleRate, musicAudioBuffer.sampleRate);
  // The voiceover defines the final length of the trailer audio.
  const mixedLength =
    mixedSampleRate === voiceoverAudioBuffer.sampleRate
      ? voiceoverAudioBuffer.length
      : Math.ceil(voiceoverAudioBuffer.duration * mixedSampleRate);

  const mixingCtx = new OfflineAudioContext(mixedChannels, mixedLength, mixedSampleRate);

  // Voiceover Source
  const voiceoverSource = mixingCtx.createBufferSource();
  voiceoverSource.buffer = voiceoverAudioBuffer;
  voiceoverSource.connect(mixingCtx.destination);

  // Music Source with Gain, fading out at the end of the voiceover
  const musicSource = mixingCtx.createBufferSource();
  musicSource.buffer = musicAudioBuffer;
  const gainNode = mixingCtx.createGain();
  const MUSIC_FADE_OUT_SECONDS = 2;
  const fadeStartTime = Math.max(0, mixedLength / mixedSampleRate - MUSIC_FADE_OUT_SECONDS);
  gainNode.gain.setValueAtTime(musicVolume, 0);
  gainNode.gain.setValueAtTime(musicVolume, fadeStartTime);
  gainNode.gain.linearRampToValueAtTime(0, mixedLength / mixedSampleRate);
  musicSource.connect(gainNode);
  gainNode.connect(mixingCtx.destination);

  voiceoverSource.start(0);
  musicSource.start(0);

  return await mixingCtx.startRendering();
}
