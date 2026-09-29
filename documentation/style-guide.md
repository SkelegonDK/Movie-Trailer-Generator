# Movie Trailer Generator – Visual Style Guide

## Core Principles

- **Modern, cinematic, and playful**
- **Consistent use of background blur** for cards and modals
- **Fun, strong accent colors** for interactive elements
- **Bold, readable headlines**
- **Monospaced/script-inspired body text** (evoking real movie scripts)

---

## Color Palette

- **Primary Accent:** #FF3366 (Vivid Pink)
- **Secondary Accent:** #00C2FF (Electric Blue)
- **Highlight:** #FFD600 (Bright Yellow)
- **Background:** #181A20 (Deep Charcoal)
- **Card/Modal BG:** rgba(255,255,255,0.10) (with blur)
- **Text (Headlines):** #FFFFFF (White)
- **Text (Body):** #E0E0E0 (Light Gray)
- **Error:** #FF3B30 (Red)
- **Success:** #4CD964 (Green)

### Dark Mode Palette (Alternative)

- **Primary Accent:** #FF3366 (Vivid Pink)
- **Secondary Accent:** #00C2FF (Electric Blue)
- **Highlight:** #FFD600 (Bright Yellow)
- **Background:** #101114 (Almost Black)
- **Card/Modal BG:** rgba(24,26,32,0.85) (Deep Charcoal, more opaque)
- **Text (Headlines):** #F5F6FA (Off-White)
- **Text (Body):** #BFC4CC (Soft Gray)
- **Error:** #FF3B30 (Red)
- **Success:** #4CD964 (Green)

> The dark mode palette reuses accent colors but deepens backgrounds and softens text for optimal contrast and eye comfort in low-light environments.

---

## Typography

- **Headlines:**
  - Font: "Frick regular", "Impact", "Arial Black", sans-serif
  - Weight: 700-900 (bold/black)
  - Uppercase for major section titles
- **Body Text:**
  - Font: "Geist Mono", "Fira Mono", "Courier New", monospace
  - Weight: 400-500
  - Mimics the look of real movie scripts
- **Buttons/Accents:**
  - Font: Inherit from headline or body, but always bold

---

## UI Effects

- **Background Blur:**
  - Use `backdrop-filter: blur(16px)` for all modals and cards
  - Layer with semi-transparent backgrounds (e.g., `rgba(255,255,255,0.10)`)
- **Cards/Modals:**
  - Border radius: 1.25rem (20px)
  - Box shadow: 0 8px 32px rgba(0,0,0,0.25)
  - Padding: 2rem
- **Buttons:**
  - Use accent colors for backgrounds (standard buttons).
  - Bold, uppercase text (common for many styles, including skeuomorphic).
  - Rounded corners:
    - Standard variants (`default`, `primary`, `destructive`, etc.): `rounded-md` (0.375rem).
    - Skeuomorphic variants: `rounded-[0.375em]` (for their distinct 3D effect).
  - Subtle shadow on hover (standard buttons).

- **Skeuomorphic Buttons:**
  - **Visual Style:** Characterized by 3D effects created through gradients, multiple `box-shadow` layers (including inset shadows), and `text-shadow`. They aim for a tactile, physical appearance.
  - **Base Colors & Variants:**
    - `skeuomorphic-primary`: #FF3366 (Vivid Pink)
    - `skeuomorphic-secondary`: #00C2FF (Electric Blue)
    - `skeuomorphic-highlight`: #FFD600 (Bright Yellow, uses black text)
    - `skeuomorphic-error`: #FF3B30 (Red)
    - `skeuomorphic-success`: #4CD964 (Green)
  - **Text:** Typically white and uppercase (except for `skeuomorphic-highlight` which uses black text for contrast).
  - **Rounded Corners:** `rounded-[0.375em]`.
  - **Interaction:** Include distinct `active` (pressed) and `focus` states, often involving changes to shadows and text appearance.
  - **Usage:** Best for prominent calls to action where a more visually distinct button is desired.

- **Spacing:**
  - Generous whitespace between elements
  - Minimum 1.5rem gap between cards

---

## Accessibility

- Ensure all text has a contrast ratio of at least 4.5:1 against its background
- Use focus outlines for all interactive elements
- Avoid color-only indicators for status

---

## Example CSS Snippets

```css
.card, .modal {
  background: rgba(255,255,255,0.10);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  padding: 2rem;
}

.headline {
  font-family: 'Geist', 'Inter', 'Arial Black', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  letter-spacing: 0.05em;
}

.body-text {
  font-family: 'Geist Mono', 'Fira Mono', 'Courier New', monospace;
  color: #E0E0E0;
  font-size: 1.1rem;
}

.button-primary {
  background: var(--primary-accent); /* Updated to use CSS variable */
  color: var(--text-on-primary-accent); /* Updated to use CSS variable */
  font-weight: bold;
  border-radius: 0.375rem; /* Matches rounded-md */
  padding: 0.75rem 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  text-transform: uppercase;
  transition: background 0.2s;
}
.button-primary:hover {
  background: var(--secondary-accent); /* Example hover, or a darker primary */
}

/* Example for Skeuomorphic (conceptual, actual implementation is via Tailwind in button.tsx) */
.button-skeuomorphic-conceptual {
  background: linear-gradient(var(--skeu-shadow-soft-gradient-overlay), var(--skeu-shadow-soft-gradient-overlay)),
              radial-gradient(90% 7% at 50% 8%, rgba(255,255,255,0.27) 25%, transparent 50%),
              var(--secondary-accent); /* Base color, e.g., secondary accent CSS variable */
  border: 0;
  border-radius: 0.375em;
  box-shadow: 0.2em 0.2em 0.5em rgba(0,0,0,0.47),
              0 -0.1em 0 0.1em rgba(0,0,0,0.27),
              0 0.1em 0 0.1em var(--skeu-highlight-soft-inset) inset,
              -0.2em 0 0.2em var(--secondary-accent-shadow-dark) inset, /* Darker shade of base */
              0 0.2em 0.2em var(--skeu-highlight-strong-inset) inset,
              0.2em 0 0.2em var(--skeu-highlight-strong-inset) inset,
              0 -0.2em 0.2em var(--secondary-accent-shadow-dark) inset; /* Darker shade of base */
  color: var(--text-on-secondary-accent); /* Updated to use CSS variable */
  text-shadow: 0 0 0.2em var(--secondary-accent-text-focus-shadow); /* Example, actual focus is different */
  /* ... other skeuomorphic properties ... */
}
```

---

## Example Usage

- **Cards/Modals:** Use blurred, semi-transparent backgrounds with strong accent buttons
- **Buttons:**
  - Standard Buttons: Use primary accent for main actions, secondary for less prominent, following the `variant` props in `button.tsx`.
  - Skeuomorphic Buttons: Use for key calls to action like "Generate Script" or "Randomize All". Prefer `skeuomorphic-primary` for the most important actions, `skeuomorphic-secondary` for others. Use `skeuomorphic-error` and `skeuomorphic-success` semantically.
- **Headlines:** Always bold, uppercase, and high-contrast
- **Body Text:** Monospaced, script-like, easy to read

---

## Notes

- This style guide is the canonical reference for all visual/branding/UI work in this project.
- Any new component or visual change must be checked against this guide for consistency.
