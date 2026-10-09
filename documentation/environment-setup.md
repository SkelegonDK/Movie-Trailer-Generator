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

Use a Next.js server runtime with a persistent archive volume and HTTPS. Production requires `TRAILER_ACCESS_PASSWORD`, including when you intend to use only browser provider keys. Generate a random password of at least 20 characters and configure it as a server secret, for example:

```bash
openssl rand -base64 32
```

Set the generated value through your host's secret manager or a protected environment file. Do not put it in a shell command that will be retained in history, commit it, or use a `NEXT_PUBLIC_` variable. Restart after changes. Sign in with username `studio` and the password. Missing or short passwords return HTTP 503; incorrect credentials receive a non-cacheable HTTP Basic challenge. The app's root Proxy protects pages, API routes, downloads, and static assets. API handlers also check access independently. Verify your deployment adapter applies Proxy to static assets; an upstream CDN must not cache or publicly serve protected responses. Do not bypass authentication in an adapter.

HTTP Basic credentials travel with requests, so expose this app only through HTTPS. Browsers may retain a Basic sign-in until closed; use separate browser profiles on shared computers and rotate the password to revoke existing credentials. Do not log Authorization headers. Development without a configured password is deliberately open for local use: bind it to `127.0.0.1`, not a public network interface. Production has no password-free bypass.

Set `TRAILER_PUBLIC_ORIGIN` to the canonical public HTTPS origin (for example `https://studio.example.com`), without a path, query or fragment. It is required for hosted browser requests because Next may expose an internal localhost URL behind a reverse proxy. Origin validation uses this configured value and ignores caller-controlled Host and forwarding headers. For local production checks, a loopback HTTP origin such as `http://127.0.0.1:3000` is supported. Restart after changes. Missing or invalid production origin configuration rejects browser archive and generation requests safely.

### Shared studio permissions

This is a small trusted studio, with one password and one archive. Every admitted user can invoke generation with the server keys, inspect key availability, read all generated assets, upload files, and delete them. It does not provide individual accounts, ownership boundaries, roles, or per-user quotas. Share the password only with people you trust with these permissions. For untrusted users, put a separate authorization and per-user accounting layer in front of the app before granting access.

Browser keys remain encrypted in each browser's vault and go directly to their provider. They are never sent to the app server; server quota limits do not cover those direct provider requests. The Settings environment check reports acceptance without disclosing provider key labels, subscription details, host errors, or secret values. Generation errors also omit raw provider error bodies. Mutating routes retain same-origin and content-type checks to reject cross-origin browser submissions even when Basic credentials are retained.

### Limits and storage

All server generation routes share a process-local budget: 30 accepted requests in a 15-minute window, including failed attempts, and at most two in progress. Rejected excess requests return HTTP 429. A provider call is aborted after 90 seconds, but cancellation does not guarantee the provider stopped processing or charging it. Generation JSON bodies are limited to 256 KiB before parsing; existing prompt, text, token, and upload limits still apply.

This budget resets on restart and is independent in every server process. It is not a distributed quota, hard spending cap, or login-attempt rate limiter. Use provider spending caps and an upstream firewall or rate limiter for credential guessing and request floods. A multi-instance deployment requires shared atomic quota storage if it needs an aggregate request cap. Do not trust client-supplied forwarding headers for per-client accounting.

The archive rejects new saves at 2 GiB (file and metadata bytes) or 1,000 distinct IDs across all content types, counting deletion tombstones. It does not evict paid generations. Download a copy if saving fails. Upload buffers are bounded per request by the existing type limits; use upstream request and concurrency limits for large uploads. A filesystem directory lock serializes archive mutations, including capacity checks, across Node processes sharing the same archive root. All processes must use that root and the same audio override, with a filesystem that supports atomic `mkdir`. It does not coordinate unrelated disks or separate serverless filesystems. Use a single persistent archive instance, or replace this storage layer with transactional shared storage.

Deletion leaves a small archive-wide tombstone so stale browser copies cannot resurrect deleted IDs. Legacy type-local tombstones are still read. Deleting a retained asset frees its file bytes but keeps its ID slot. After exhausting the lifetime ID budget, rotate to a fresh archive as an explicit owner operation: back up retained files, stop the studio, clear old browser Library caches, and configure a new archive root before restarting. Never silently purge tombstones while old browser copies can reconnect.

An interrupted server can leave `.archive-lock` behind. New mutations then fail safely as busy. Stop every process using the volume, inspect and remove that lock directory, then restart; never remove an active lock. Failed pending writes are cleaned up normally; after a crash, inspect orphan `.pending-*` directories with the server stopped and remove them if appropriate. Keep archive backups and use disk quotas as an additional storage boundary.

No external authentication provider, database, or encryption-secret environment variable is required for this shared-studio configuration.
