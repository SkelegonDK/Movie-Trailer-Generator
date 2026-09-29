/**
 * Shared caption style for the trailer video, used by the store, the live
 * preview and the video renderer. Modeled after the inspector panel in
 * video editors: font size, text alignment, vertical alignment, all caps,
 * and a free X/Y position.
 */
export type HorizontalAlign = "left" | "center" | "right"

export interface CaptionStyle {
  /** Caption font size as a percentage of the video height (2–10). */
  fontSize: number
  /** Text alignment inside the caption block. */
  horizontalAlign: HorizontalAlign
  /** Horizontal anchor of the caption block as a percentage of the width (0–100). */
  horizontalPosition: number
  /** Vertical center of the caption block as a percentage from the top (10–90). */
  verticalPosition: number
  /** Render the caption text in all caps. */
  allCaps: boolean
  /** Maximum number of words shown per caption. */
  maxWords: number
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 5,
  horizontalAlign: "center",
  horizontalPosition: 50,
  verticalPosition: 74,
  allCaps: true,
  maxWords: 6,
}

export const FONT_SIZE_MIN = 2
export const FONT_SIZE_MAX = 10
export const HORIZONTAL_POSITION_MIN = 0
export const HORIZONTAL_POSITION_MAX = 100
export const VERTICAL_POSITION_MIN = 10
export const VERTICAL_POSITION_MAX = 90
export const MAX_WORDS_MIN = 3
export const MAX_WORDS_MAX = 10

/** Presets used by the Vertical Alignment buttons in the settings panel. */
export const VERTICAL_ALIGN_PRESETS: Array<{
  label: "top" | "middle" | "bottom"
  position: number
}> = [
  { label: "top", position: 25 },
  { label: "middle", position: 50 },
  { label: "bottom", position: 75 },
]
