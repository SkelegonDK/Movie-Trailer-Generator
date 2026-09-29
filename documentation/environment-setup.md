# Environment setup

Copy `.env.example` to `.env.local` at the repository root and set:

```dotenv
OPENROUTER_API=your-openrouter-key
ELEVENLABS_API=your-elevenlabs-key
```

- `OPENROUTER_API` is used for titles, scripts, poster specifications, and poster images.
- `ELEVENLABS_API` is used for narration. The configured voice must be available to your account.

These are server-side variables. Do not use `NEXT_PUBLIC_` prefixes or commit `.env.local`. Restart the Next.js server after changing keys. Open `/settings` to check provider acceptance; validation makes requests to the providers.

You can also save provider keys in Settings. The vault encrypts keys with AES-GCM in localStorage and keeps a non-extractable encryption key in IndexedDB. Saved browser keys are sent directly to the corresponding provider and take precedence over its server environment key. Providers without a saved browser key use the server routes. Use HTTPS or localhost for browser encryption support. Clearing site data removes saved keys; the environment status panel checks only server keys.

## Provider configuration in source

| Service | Configuration locations |
| --- | --- |
| OpenRouter text model | `lib/api-client.ts`, `app/api/openrouter-chat/route.ts` |
| OpenRouter image model | `lib/api-client.ts`, `app/api/openrouter-image/route.ts` |
| ElevenLabs voice, speech model, and voice settings | `lib/elevenlabs-config.ts` (shared by client and server) |

Update both the client and corresponding server route if changing an OpenRouter model. ElevenLabs uses voice `24SBbCTZyk79Li12qFkf` and the quality-focused `eleven_v4` model from the shared configuration. Model IDs and access depend on your provider account.

Trailer prompts in `app/scriptPrompts.ts` use v4 square-bracket delivery and pause tags. The speech request preserves these cues; video captions omit them. V4 voice settings include stability and similarity only. See the [ElevenLabs v4 prompting guide](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices#prompting-eleven-v4).

## Hosting

Use a Next.js server runtime and configure the same variables in the hosting environment. The application has no built-in authentication or request limits on the generation routes. Restrict access before making an instance with server keys publicly reachable.

No authentication provider, database, or encryption-secret environment variable is required.
