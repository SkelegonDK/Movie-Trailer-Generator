# The Last Espresso — renderer sample

This is a fictional, original demo with an illustrated SVG poster, a short script and procedural music. It demonstrates the app’s real 9:16 video renderer and estimated caption timing without API keys. It does not include narration or claim to demonstrate live AI generation. The studio screenshot shows the running application with sample inputs.

The original poster, script and renderer source use the repository’s MIT license. The music is dedicated to the public domain under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), with no attribution required. It was synthesized without external samples by `scripts/generate-trailer-music.py`, included with the [dedication notice](../../licenses/trailer-music-CC0.txt) in the asset-provenance change.

## Reproduce the video

From the repository root, with Bun dependencies installed:

```bash
bun build examples/demo/render.ts --target browser --outfile examples/demo/render.js
python3 -m http.server 3128 --bind 127.0.0.1 --directory examples/demo
```

Open http://localhost:3128 and choose **Render 12-second demo**. Keep the tab open until the download completes. Chrome or Safari records MP4 when supported, otherwise WebM. The reference MP4 was recorded in Chromium and compressed with ffmpeg for a smaller repository download:

```bash
ffmpeg -i recorded.mp4 -c:v libx264 -crf 28 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart -map_metadata -1 examples/demo/the-last-espresso.mp4
```

`render.js` is a local build artifact and is ignored by Git. No files are saved to the application’s archive and no provider endpoints are called.
