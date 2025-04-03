# Project: Stupid Movie Trailer Generator

## Overview & Core Features
- Generate movie trailer scripts using AI
- Convert scripts to voice-overs using ElevenLabs
- Mix voice-overs with background music
- Custom or random mode for trailer elements

## Technical Stack & Architecture
- Frontend: Streamlit
- Script Generation:
    - Local: Ollama (e.g., llama3.2:3b model) via direct API calls
    - Online: OpenRouter API (various free models) via direct API calls
- Voice Generation: ElevenLabs API
- Audio Processing: pydub
- Configuration: Streamlit Secrets (`st.secrets`) for API keys

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

## Model Selection & Generation Logic
- A toggle (`Use Local Models`) in the Streamlit sidebar controls model selection (`st.session_state.use_local_model`).
- **Local Mode (True):**
    - Uses Ollama models listed via `ollama list`.
    - Calls functions in `scripts/functions.py`:
        - `generate_movie_name_with_id`
        - `generate_script_with_ollama`
- **Online Mode (False):**
    - Uses OpenRouter API with a predefined list of free models (e.g., `deepseek/deepseek-chat-v3-0324:free`, `mistralai/mistral-small-3.1-24b-instruct:free`).
    - Calls functions defined directly within `app.py`:
        - `generate_movie_name_with_openrouter`
        - `generate_script_with_openrouter`
    - Requires `OPENROUTER_API_KEY` in `st.secrets`.
- **Prompts:** Standardized prompts for title and script generation are stored in `scripts/prompts.py` and used for both Ollama and OpenRouter calls.
- **Configuration:** `config.py` loads API keys from `st.secrets` and defines default settings. `scripts/openrouter_client.py` provides a client class (currently unused by the main app flow but available).

## Decisions & Clarifications
- [2025-04-03] Integrated OpenRouter API as an alternative LLM provider alongside local Ollama models. Added UI toggle for selection. Fixed response handling bugs for title generation (Ollama expecting JSON, OpenRouter complex cleanup). Improved error handling and added timeouts for OpenRouter API calls in `app.py`. Added unit tests for app-level OpenRouter functions.
  - Reason: Provide users with more model choices and flexibility. Address critical bugs preventing model usage. Improve robustness.
  - Benefits: Increased model variety, fixed title generation, improved error reporting. (Note: Intermittent network errors during script generation with OpenRouter may still occur).
- [2025-02-09] Switched from ffmpeg shell commands to pydub for audio processing
  - Reason: More Pythonic approach, better error handling, and simpler code
  - Benefits:
    - No external ffmpeg dependency required
    - Direct audio manipulation in Python
    - Better control over audio stretching and volume
    - Cleaner error handling
