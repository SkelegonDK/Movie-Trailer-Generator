# Environment setup

Copy `.env.example` to `.env.local` at the repository root and set:

```dotenv
OPENROUTER_API=your-openrouter-key
ELEVENLABS_API=your-elevenlabs-key
```

- `OPENROUTER_API` is used for titles, scripts, poster specifications, and poster images.
- `ELEVENLABS_API` is used for narration. The configured voice must be available to your account.

These are server-side variables. Do not use `NEXT_PUBLIC_` prefixes or commit `.env.local`. Restart the Next.js server after changing keys. Open `/settings` to check provider acceptance; validation makes requests to the providers.

For this release, configure keys through the environment. The browser-vault UI is present, but `loadKeys()` currently clears saved browser keys and falls back to the server routes.

## Provider configuration in source

| Service | Configuration locations |
| --- | --- |
| OpenRouter text model | `lib/api-client.ts`, `app/api/openrouter-chat/route.ts` |
| OpenRouter image model | `lib/api-client.ts`, `app/api/openrouter-image/route.ts` |
| ElevenLabs voice and speech model | `lib/api-client.ts`, `app/api/elevenlabs-tts/route.ts` |

Update both the client and corresponding server route if changing a provider model or voice. Model IDs and access depend on your provider account.

## Hosting

Use a Next.js server runtime and configure the same variables in the hosting environment. The application has no built-in authentication or request limits on the generation routes. Restrict access before making an instance with server keys publicly reachable.

Clerk, Supabase, an encryption-secret environment variable, and a credit system are not part of the current implementation. Earlier documentation describing them was a plan, not a setup requirement.
