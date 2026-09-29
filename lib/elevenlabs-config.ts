// Shared by browser-key requests and the server environment-key proxy.
export const TTS_VOICE_ID = "24SBbCTZyk79Li12qFkf"
export const TTS_MODEL_ID = "eleven_v4"

// V4 uses Stability and Similarity; delivery and pacing belong in audio tags.
export const TTS_VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.8,
} as const
