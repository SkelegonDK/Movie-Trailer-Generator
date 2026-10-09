# Bundled assets

The repository's [MIT license](LICENSE) covers original project code. Third-party code and assets retain their own licenses.

## Frick font

- Creator: Dennis Grauel.
- Source: [dennisgrauel/Frick](https://github.com/dennisgrauel/Frick).
- File: `public/assets/Frick0.3-Regular.otf` (upstream `fonts/otf/Frick0.3-Regular.otf`).
- License: SIL Open Font License 1.1. The original [license](licenses/Frick-OFL.txt) and [author record](licenses/Frick-AUTHORS.txt) are included unchanged.
- Provenance: the bundled file matches the upstream Git blob `653615b650876e4165eae5da308e90975e846936` exactly; no modifications were made.

## Trailer music

`public/assets/trailer_music.mp3` is the original bundled soundtrack, retained unchanged. The repository maintainer identifies it as public domain. Its original download URL and creator are not recorded in the repository; this statement records the maintainer-provided rights information rather than an independently verified source.

Unused duplicate music and font files were removed from `app/assets/`; runtime assets remain in `public/assets/`.

## Other third-party assets

- Geist and Geist Mono are loaded by `next/font/google` from the [Geist font project](https://github.com/vercel/geist-font), licensed under SIL OFL 1.1. Their upstream license is included in [licenses/Geist-OFL.txt](licenses/Geist-OFL.txt).
- PixelBlast retains its original [MIT + Commons Clause notice](components/backgrounds/LICENSE.md). That notice permits use within applications but restricts selling, sublicensing, or redistributing the components themselves; review the full notice before reusing the component.

When replacing assets, record the source and license here and include any required notices. Generated user content remains subject to its provider terms and the user's input rights.
