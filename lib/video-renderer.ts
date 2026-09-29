import type { CaptionStyle, HorizontalAlign } from "./caption-style"

export type { CaptionStyle, HorizontalAlign }
export const VIDEO_WIDTH = 1080
export const VIDEO_HEIGHT = 1920

/**
 * Loads the Frick headline font used for captions so canvas rendering can use
 * it. The font is already declared via @font-face in globals.css.
 */
export async function ensureCaptionFont(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return
  try {
    await document.fonts.load("64px Frick")
  } catch {
    // Fall back to system fonts if the webfont cannot be loaded.
  }
}

/**
 * Loads a poster image (data URL or regular URL) for canvas drawing.
 * @param {string} posterUrl - The poster image URL (data URLs avoid CORS issues).
 * @returns {Promise<HTMLImageElement>} The decoded image, ready to draw.
 * @example
 * const poster = await loadPosterImage(posterUrl);
 * drawTrailerFrame(ctx, { poster, captionText: "IN A WORLD...", style, width: 1080, height: 1920 });
 */
export async function loadPosterImage(posterUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load the poster image"))
    image.src = posterUrl
  })
}

function drawPosterCover(
  ctx: CanvasRenderingContext2D,
  poster: HTMLImageElement,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / poster.width, height / poster.height)
  const drawWidth = poster.width * scale
  const drawHeight = poster.height * scale
  const offsetX = (width - drawWidth) / 2
  const offsetY = (height - drawHeight) / 2
  ctx.drawImage(poster, offsetX, offsetY, drawWidth, drawHeight)
}

function textAlignFor(align: HorizontalAlign): CanvasTextAlign {
  return align === "left" ? "left" : align === "right" ? "right" : "center"
}

/**
 * Computes the widest the caption text may be, given the anchor position and
 * alignment, so the text never runs off the edge of the frame.
 */
function maxTextWidthFor(
  align: HorizontalAlign,
  anchorX: number,
  width: number,
): number {
  const margin = width * 0.08
  if (align === "left") return Math.max(100, width - margin - anchorX)
  if (align === "right") return Math.max(100, anchorX - margin)
  return Math.max(100, Math.min(anchorX - margin, width - margin - anchorX) * 2)
}

function wrapCaptionText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Draws a single frame of the trailer video: the poster cover-fitted onto a
 * 9:16 canvas, plus the active caption (if any). Shared by the live preview
 * and the video recorder so both always look identical.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context to draw on.
 * @param {object} opts - Frame inputs.
 * @param {HTMLImageElement | null} opts.poster - The loaded poster image, or null for a black frame.
 * @param {string | null} opts.captionText - Text for the active caption, or null when none is active.
 * @param {CaptionStyle} opts.style - Caption style (font size %, vertical position %).
 * @param {number} opts.width - Canvas width in pixels.
 * @param {number} opts.height - Canvas height in pixels.
 */
export function drawTrailerFrame(
  ctx: CanvasRenderingContext2D,
  opts: {
    poster: HTMLImageElement | null
    captionText: string | null
    style: CaptionStyle
    width: number
    height: number
  },
): void {
  const { poster, captionText, style, width, height } = opts

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, width, height)
  if (poster) {
    drawPosterCover(ctx, poster, width, height)
  }

  if (!captionText || !captionText.trim()) return

  const displayText = style.allCaps ? captionText.toUpperCase() : captionText
  const fontPx = (height * style.fontSize) / 100
  const anchorX = (width * style.horizontalPosition) / 100
  const maxTextWidth = maxTextWidthFor(style.horizontalAlign, anchorX, width)
  ctx.font = `${fontPx}px Frick, "Arial Black", Arial, sans-serif`
  ctx.textAlign = textAlignFor(style.horizontalAlign)
  ctx.textBaseline = "alphabetic"

  const lines = wrapCaptionText(ctx, displayText, maxTextWidth)
  const lineHeight = fontPx * 1.12
  const blockHeight = lines.length * lineHeight
  const centerY = (height * style.verticalPosition) / 100
  let baseline = centerY - blockHeight / 2 + lineHeight * 0.82

  ctx.lineJoin = "round"
  ctx.miterLimit = 2
  ctx.lineWidth = fontPx * 0.09
  ctx.strokeStyle = "#000000"
  ctx.fillStyle = "#ffffff"
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)"
  ctx.shadowBlur = fontPx * 0.35
  ctx.shadowOffsetY = fontPx * 0.06

  for (const line of lines) {
    ctx.strokeText(line, anchorX, baseline)
    ctx.fillText(line, anchorX, baseline)
    baseline += lineHeight
  }

  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}
