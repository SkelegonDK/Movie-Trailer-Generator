# Status

## Current Goals

- Fix openrouter integration.
- pass all tests

## Developer Tasks (Require approval to modify)

- [ ] Task assigned to developer

## In Progress

## Completed
- [x] Add pydub to the requirements.
- [x] Update the documentation to explain how to use Streamlit's secrets management
- [x] Implement audio stretching using pydub
- [x] Update documentation for audio processing requirements
- [x] Remove ffmpeg dependency in favor of pydub
- [x] Integrate OpenRouter API for title and script generation.
- [x] Add UI toggle for selecting between local (Ollama) and online (OpenRouter) models.
- [x] Fix bugs in title generation response handling for Ollama and OpenRouter.
- [x] Improve error handling for OpenRouter API calls.
- [x] Add unit tests for OpenRouter functions in app.py.
- [x] Update prompts for clarity and consistency.
- [x] Add comprehensive tests for movie name generation functionality [T123] [Complexity: 7/10] [Priority: High] [Status: Complete]
  - Context: Ensure reliability of movie name generation with proper test coverage
  - Acceptance criteria: All test cases pass, including success and error scenarios
  - Dependencies: None
  - Subtasks:
    - [x] [T123.1] Test successful movie name generation [Complexity: 3/10]
    - [x] [T123.2] Test empty response handling [Complexity: 2/10]
    - [x] [T123.3] Test invalid response handling [Complexity: 2/10]
    - [x] [T123.4] Test API error handling [Complexity: 2/10]
    - [x] [T123.5] Test missing fields handling [Complexity: 2/10]

## Next Up
- [ ] Add image prompt generation as a future feature
- [ ] Add a mechanism to check that the movie title output is valid.
- [ ] Add `assets/audio/trailer_music.mp3` to the repository.
