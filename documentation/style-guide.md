# Visual styles

The implemented tokens are in [`app/globals.css`](../app/globals.css). The app currently uses one dark palette, selected by the root layout. There is no light-mode switch.

## Palette

| Token | Value | Purpose |
| --- | --- | --- |
| `--background` | `#181a20` | Page background |
| `--foreground` | `#ffffff` | Default text |
| `--card` | `#22242c` | Card background |
| `--card-foreground` | `#e0e0e0` | Card text |
| `--primary` | `#ff3366` | Primary actions |
| `--secondary` | `#00c2ff` | Secondary actions |
| `--accent` | `#ffd600` | Highlights, with black foreground |
| `--destructive` | `#ff3b30` | Destructive actions |
| `--success` | `#4cd964` | Success accent |

The CSS also defines translucent border, input, and muted colors, plus accent aliases used by the skeuomorphic button variants. Use the existing semantic utility classes where available.

## Typography

The root layout loads Geist and Geist Mono through `next/font/google`. Body text uses Geist Mono. The `.headline` class uses the bundled Frick font, with Geist and sans-serif fallbacks, uppercase text, and `0.05em` letter spacing. The Frick font is served from `public/assets/Frick0.3-Regular.otf`.

## Components

- [`Card`](../components/ui/card.tsx) uses a solid card background, border, small shadow, and `rounded-lg` corners. Headers and content use six spacing units of padding. Cards do not apply background blur by default.
- [`Dialog`](../components/ui/dialog.tsx) uses a solid dialog background, border, large shadow, and rounded corners at the small breakpoint and above.
- [`Button`](../components/ui/button.tsx) defines standard and skeuomorphic variants. Standard corners use `rounded-md` (`0.375rem`); skeuomorphic variants use `0.375em`, layered shadows, and highlight gradients.
- The shared large corner radius is `1.25rem`. Component classes can override it.

The sidebar is fixed on desktop and becomes a top bar with a navigation sheet on mobile. Keep labels, keyboard focus, and text contrast readable when adding or changing controls; the palette alone does not guarantee accessible contrast.
