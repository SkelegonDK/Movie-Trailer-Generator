# Project: Stupid Movie Trailer Generator

## Overview & Core Features
- Generate movie trailer scripts using AI
- Convert scripts to voice-overs using ElevenLabs
- Mix voice-overs with background music
- Custom or random mode for trailer elements

## Technical Stack & Architecture
- Frontend: Streamlit
- Script Generation:
    - Online: OpenRouter API (configurable models via `config.py`)
- Voice Generation: ElevenLabs API
- Audio Processing: pydub
- Configuration: `config.py` loading from Environment Variables / Streamlit Secrets (`st.secrets`) for API keys and model settings.

## Audio Processing Design
- Voice-over files are saved in `generated_audio/` with prefix `voiceover_`
- Final mixed files are saved in same directory with prefix `final_`
- Background music is stored in `assets/audio/trailer_music.mp3`
- Audio mixing process:
  1. Load voice-over and background music using pydub
  2. Calculate ratio between voice-over and music length
  3. Stretch background music:
     - For longer voice-overs: slow down using frame rate adjustment
     - For shorter voice-overs: speed up using pydub's speedup function
  4. Reduce background music volume by -20dB
  5. Mix audio streams with precise alignment

## Decisions & Clarifications
- [2025-02-09] Switched from ffmpeg shell commands to pydub for audio processing
  - Reason: More Pythonic approach, better error handling, and simpler code
  - Benefits: 
    - No external ffmpeg dependency required
    - Direct audio manipulation in Python
  - Better control over audio stretching and volume
  - Cleaner error handling

## Model & Generation Logic (OpenRouter Only)
- Script and title generation exclusively uses the OpenRouter API.
- The list of available models and the default model are configured in `config.py`.
- These settings can be overridden via environment variables or `.streamlit/secrets.toml` (see `README.md` for details).
- The `call_llm` utility function in `utils/llm_api.py` handles the API interaction.
- API keys are loaded via `config.py`.
- Prompts are defined in `scripts/prompts.py`.
