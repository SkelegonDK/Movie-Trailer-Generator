# Architecture notes

This document describes asset storage, generation ownership, and known implementation limitations. See the [project README](../README.md) for setup and usage.

## Asset storage

Generated scripts, audio, posters, and videos are saved to the server's `.trailer-library/` directory, outside `.next` and `public`. The archive is ignored by Git. Each asset has an ID folder containing its original file and `metadata.json`.

All browsers using the same server share the archive. `TRAILER_LIBRARY_DIR` changes its root; `TRAILER_AUDIO_LIBRARY_DIR` provides a legacy override for the audio folder. Hosted instances require persistent storage and access control.

The Library migrates retained browser assets to the server archive when opened. Existing assets must be migrated from their original browser before its site data is cleared. Temporary object URLs alone cannot recover files after the original document closes.

Archive behavior:

- Saves preserve original media bytes and source metadata.
- Retrying a save does not overwrite an existing asset's bytes.
- Deletion markers prevent stale browser copies from restoring deleted assets.
- Unavailable browser storage does not block server archive access.
- Failed server saves preserve completed generation and attempt browser storage as a fallback. The UI warns users to download a copy.
- Downloads use HTTP attachment links; video previews support byte ranges.
- Uploads validate asset IDs, metadata, file signatures, size limits, and request origin.

Relevant code: [browser library](../lib/content-library.ts), [server archive](../lib/server/content-library.ts), [audio compatibility layer](../lib/server/audio-library.ts), and [Library UI](../components/content-library.tsx).

## Generation ownership

The [workflow page](../app/page.tsx) keeps its panels mounted, coordinates navigation, and disables source editing while generation is active. The [store](../lib/store.ts) manages script and audio generation, including locks against duplicate requests. Poster and video generation are managed by their respective components.

Script edits invalidate the current audio. Replaced or invalidated audio playback URLs are revoked; archived files remain available independently of those URLs. Video output is invalidated when its poster, audio, script, or caption style changes. Rendering supports cancellation and releases capture resources.

Known limitations:

- Script edits retain the current poster. After new audio generation, a video can reuse artwork made for an earlier script. A future change could flag potentially outdated artwork while preserving the paid asset.
- Caption controls remain editable during video export. Changing them aborts the current render without explaining the cancellation. Disable those controls during export or communicate the cancellation explicitly.

Relevant code: [poster generation](../components/poster-generator.tsx), [video generation UI](../components/video-generator.tsx), and [video renderer](../lib/video-generator.ts).

## Browser audio

Audio generation and video preview share an `AudioContext` reference through the [audio engine](../lib/audio-engine.ts). Callers coordinate context setup and resume, decoding, music stretching, mixing, and export.

The [time-stretching implementation](../lib/time-stretch.ts) adjusts background music length while preserving pitch. The generated mix is retained as WAV bytes rather than relying on a temporary playback URL. Legacy session history remains available for migration.

Further work could consolidate context readiness and mixing into the audio engine. Closed-context recreation and rejected resume behavior need dedicated coverage before changing ownership.

## Verification

The [test suite](../tests/) covers archive persistence, concurrent saves, idempotent retries, browser-storage failures, migration, deletion, file validation, HTTP ranges, caption timing, audio stretching, and video resource cleanup. Provider requests are mocked; the suite does not validate live model access or paid generation.

Run `bun test` and `bun run build` from the repository root. See the README for the standalone TypeScript check.
