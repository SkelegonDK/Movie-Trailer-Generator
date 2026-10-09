# Movie Trailer Generator

Turn an absurd movie idea into a trailer with an AI-written title and script, a cinematic poster, a voiceover, background music, and a downloadable video.

This is the Next.js replacement for the original Python/Streamlit app. The old codebase is preserved on [`archive/streamlit`](https://github.com/SkelegonDK/Movie-Trailer-Generator/tree/archive/streamlit) and the [`legacy-streamlit`](https://github.com/SkelegonDK/Movie-Trailer-Generator/tree/legacy-streamlit) tag. Existing Python environments and Streamlit configuration do not apply to this version.

## Features

- Custom, Blockbuster (the default), AAA Game, and Stupid modes for genre, setting, character, conflict, and plot twist. AAA Game uses game-specific parameters and cinematic game-reveal direction for generated titles and scripts.
- Editable movie titles and trailer scripts generated through OpenRouter.
- Poster generation through OpenRouter, with a structured cinematic art direction prompt.
- ElevenLabs narration mixed with the included background music in the browser.
- Pitch-preserving music stretching to fit the voiceover and a downloadable WAV mix.
- Vertical trailer video with a poster background, live preview, and adjustable captions.
- MP4 export when supported by the browser, with WebM as a fallback.
- A searchable Library for reviewing, playing, downloading, and deleting generated scripts, audio, posters, and videos.

## Run locally

You need Node.js 22.4 or newer, Bun 1.3 or newer, and API keys for OpenRouter and ElevenLabs. Use a modern browser with Web Audio, Canvas capture, and MediaRecorder support.

```bash
git clone https://github.com/SkelegonDK/Movie-Trailer-Generator.git
cd Movie-Trailer-Generator
bun install --frozen-lockfile
cp .env.example .env.local
```

Fill in `.env.local`:

```dotenv
OPENROUTER_API=your-openrouter-key
ELEVENLABS_API=your-elevenlabs-key
```

These exact variable names are required. The Next.js API routes use the keys on the server; do not prefix them with `NEXT_PUBLIC_`. `.env.local` is ignored by Git.

```bash
bun run dev
```

Open [localhost:3000](http://localhost:3000). The [Settings page](http://localhost:3000/settings) can check whether the server keys are configured and accepted by the providers. Restart the server after changing environment variables.

Alternatively, save your own keys in Settings. They are encrypted at rest in this browser using AES-GCM, with a non-extractable key stored in IndexedDB. Browser keys take precedence for each provider and are sent directly to that provider when generating content. A provider without a saved browser key uses the server environment key. Browser storage requires HTTPS or localhost; clearing browser data removes saved keys.

## Make a trailer

The workflow runs on one page with sliding Idea, Script, Audio, Poster, and Video sections. Movie details and context stay visible beside the active section (above it on smaller screens). On phones, the production details start collapsed to leave more room for the form; choose Details to expand them. The production status remains visible. Use Back, Next, or the step tabs at any time. Successful generation advances automatically when you are still viewing that section.

1. Choose a parameter mode and fill in or randomize the movie elements.
2. Generate a title and script, then edit the text as needed.
3. Generate the narration and music mix. Preview or download the audio.
4. Generate the movie poster.
5. Preview the video, adjust caption size, alignment, position, capitalization, and words per caption, then generate and download it.

Video rendering happens in the browser in real time. Keep the tab open until export finishes. Captions are estimated from the script and audio duration rather than provider word timestamps.

Successful generations are saved automatically in the [Library](http://localhost:3000/library), including original video, audio and image files, scripts, and metadata. Search by title, script, or movie parameters; filter by content type; and open an item to review or download it. The Library reads files from the app server, so browsers using the same server see the same assets even after clearing browser storage. Downloads use permanent HTTP attachment links; video previews support byte ranges.

Files are stored in the repo's `.trailer-library/` directory, which is git-ignored. Each asset has its own ID folder and `metadata.json` alongside its original file:

```text
.trailer-library/
  audio/<id>/audio.wav
  poster/<id>/poster.png     # or the original image format
  video/<id>/video.mp4       # WebM when MP4 is unavailable
  script/<id>/script.txt
```

Keep this folder backed up. Deleting an item in Library removes its server file and browser copy. All browsers using this server share the archive. Optional `TRAILER_LIBRARY_DIR` changes the archive root; the older `TRAILER_AUDIO_LIBRARY_DIR` setting still overrides the audio folder. Restart the server after changing either setting. Hosted instances need a persistent disk or volume; ephemeral/serverless filesystems do not retain these files. Keep the instance local or access-controlled.

Open Library in the browser that holds your existing assets before clearing its data. It automatically migrates retained videos, images, audio, and scripts to the repo archive. Older session audio is imported when its original file is still available. Files already lost in a purge cannot be recovered. If a save fails, generation still completes and asks you to download a copy; Library reports any files that remain only in the browser.


## Development

```bash
bun test           # Automated tests; provider calls are mocked
bun run build      # Production build
bun run start      # Serve the production build
bunx tsc --noEmit   # Independent TypeScript check
```

The production build checks TypeScript. Run the standalone type check after an initial build has generated Next.js type declarations.

| Path | Purpose |
| --- | --- |
| `app/` | Next.js pages, prompts, and server API routes |
| `components/` | Trailer workflow and reusable UI |
| `lib/` | API client, audio processing, captions, video rendering, and state |
| `assets/` | Movie parameter lists and artwork |
| `public/assets/` | Browser-served music and font |
| `tests/` | Bun test suite |
| `documentation/` | Setup details and implemented visual styles |

The app uses Next.js, React, TypeScript, Tailwind CSS, Radix UI, and Zustand. Bun is the package manager and test runner.

## Configuration and hosting

See [environment setup](documentation/environment-setup.md) for provider configuration. No Python runtime, Ollama service, database, or authentication provider is required.

This release is intended for local or access-controlled use. Generation routes have no authentication or rate limiting; anyone who can access a hosted instance can make requests using its server API keys. Provider usage may incur charges. A deployment needs a Next.js server runtime, not a static-only host.

OpenRouter model IDs are configured in `lib/api-client.ts` and `app/api/`. ElevenLabs voice and model settings are shared in `lib/elevenlabs-config.ts`. Availability depends on your provider account. Automated tests mock provider calls and do not validate live generation.

## License

[MIT](LICENSE). The original public repository's license is retained.
