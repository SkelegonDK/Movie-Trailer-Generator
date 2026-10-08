# Architecture review — validated findings

Date: 2026-10-08. Two independent agents reviewed the report against the implementation and existing tests. The validated backlog is stored in the [Movie Trailer Generator Linear project](https://linear.app/manuel-thomsen/project/movie-trailer-generator-4dc92553eb24). Individual issue creation is blocked by the workspace's free-plan issue limit; these are ready-to-create issue descriptions.

Linear document: [Validated architecture backlog and audio retention](https://linear.app/manuel-thomsen/document/validated-architecture-backlog-and-audio-retention-b191c680c858).

Implementation validation: 117 tests pass, standalone TypeScript check and production build pass. A real browser test cleared IndexedDB, localStorage, and sessionStorage, reloaded Library, played the retained audio with its source metadata, and downloaded its WAV. Changes are in the working tree, not committed or deployed.

Backlog:

- [ ] High / In review: durable trailer audio retention (implemented).
- [ ] Medium / Explore: generation outcome ownership and poster provenance.
- [ ] Medium / Fix: visible video cancellation during caption editing.
- [ ] Low / Explore: audio engine readiness and ownership.
- [ ] Medium / In review: audio retention consolidation and temporary URL cleanup (implemented).

## Fix: retain generated trailer audio outside browser storage

Priority: High. Confirmed requirement; implemented in this change, pending review.

Audio already survives deleting localStorage alone: Library stores Blob bytes in IndexedDB. A full site-data purge or storage eviction can delete those bytes. Session history stores temporary object URLs and cannot recover them after document closure.

Save generated WAV mixes and metadata on the server, outside `.next` and `public`, in a configurable persistent directory. Library must list and play these assets with empty or unavailable IndexedDB. Migrate retained browser audio before purge; retain legacy session import. Deletion must remove server copies and prevent stale browser migration from restoring them. Preserve playback and warn when a durable save fails. Hosted instances require a persistent volume and access control; browser clients share the server archive.

Acceptance:

- Generate/save audio, clear IndexedDB and session storage, reload Library, play/download identical WAV bytes and inspect source metadata.
- Reopen the filesystem archive and recover records; test concurrent saves and idempotent retries.
- Unavailable browser storage cannot block durable saves or reads.
- Failed server saves preserve playback and show an accurate warning.
- Migration is idempotent; server deletion cannot be undone by stale cached audio.
- Reject invalid paths, malformed uploads, excessive sizes, and foreign origins.

Files: `lib/content-library.ts`, `lib/store.ts`, `lib/server/audio-library.ts`, `app/api/library/audio/`, `components/content-library.tsx`.

## Explore: generation outcome ownership and source provenance

Priority: Medium. Original report strength: Strong. Validated strength: Worth exploring.

Generation lifecycle ownership is spread between the store, poster view, and video view. However, the root page already disables editing during generation and keeps workflow panels mounted; script/audio locks and video cancellation already exist. A broad normal-UI generation race was not demonstrated. Do not introduce a shared module solely by moving handlers.

The reproduced freshness question is that script edits invalidate audio but retain a ready poster. After new audio generation, video can reuse artwork for the old script. Decide explicitly whether to retain with a stale indication or invalidate it; avoid silently discarding paid artwork without that decision.

Acceptance:

- Document current input snapshots, completion, archiving, and invalidation ownership.
- Decide poster reuse for materially changed stories versus minor narration edits.
- Exercise retries, optional archive failure, source changes, and late completion through the generation interface.
- Propose a deep module only if it absorbs demonstrated coordination and improves locality and leverage.

Files: `app/page.tsx:37`, `lib/store.ts:105`, `components/poster-generator.tsx:29`, `components/video-generator.tsx:227`.

## Fix: communicate or prevent video cancellation during caption edits

Priority: Medium. Confirmed narrow behavior from generation review.

Caption controls ignore the view's disabled/generating state. Editing them during rendering triggers the source/style invalidation effect, silently aborting the render. Existing low-level abort cleanup works.

Acceptance: either disable every caption control during export or communicate cancellation and its cause. Exercise each control, verify resource cleanup, and verify subsequent regeneration. This is separate from the speculative generation-module consolidation.

Files: `components/video-generator.tsx` (caption controls and invalidation effect).

## Explore: deepen browser audio engine ownership

Priority: Low. Validated strength: Worth exploring.

Three construction sites share one AudioContext ref; the report must not imply three simultaneous context allocations. The shallow audio-engine module exposes mutable ownership while callers coordinate context setup, resume, decoding, stretching, mixing, and export. Closed-context recreation and rejected resume behavior are not tested.

Acceptance: evaluate a deeper audio-engine module that absorbs context readiness and narration-to-mix sequencing. Keep signal-processing implementation internal and preserve existing DSP tests. Test successful production, decode/music failure, resume failure, and a closed context through its interface before committing to a new seam.

Files: `lib/audio-engine.ts`, `lib/store.ts`, `components/video-generator.tsx`, `lib/time-stretch.ts`, `lib/audio-utils.ts`.

## Fix/explore: consolidate audio retention and playback URL ownership

Priority: Medium. Dual retention is exploratory; missing audio URL cleanup is confirmed and addressed in this change.

New audio previously wrote session metadata before IndexedDB archival, while session import later retried recovery. Audio object URLs were never revoked on invalidation, replacement, or history eviction. Library and video URLs already have cleanup.

Acceptance: stop new session-history writes once durable audio is authoritative, retain migration for old entries, pass Blobs directly to retention, and release current audio URLs when replaced or invalidated. Verify durable assets remain readable after temporary URL release. Avoid a generic persistence module unless a concrete adapter variation justifies its seam.

Files: `lib/store.ts`, `lib/audio-utils.ts`, `lib/content-library.ts`, `components/content-library.tsx`.
