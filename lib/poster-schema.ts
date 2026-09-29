import { z } from "zod";

// Schema for visual style and composition
const visualStyleSchema = z.object({
  style: z.string().describe("Overall visual style (e.g., 'noir', 'minimalist', 'retro')"),
  colorPalette: z.array(z.string()).min(2).max(5).describe("2-5 main colors to use"),
  mood: z.string().describe("Emotional tone of the poster"),
  lighting: z.string().describe("Lighting style and direction"),
});

const compositionSchema = z.object({
  layout: z.string().describe("Layout type (e.g., 'centered', 'split', 'diagonal')"),
  focusPoint: z.string().describe("Main focal point of the image"),
  perspective: z.string().describe("Camera angle or viewpoint"),
  depth: z.string().describe("Depth and dimensionality description"),
});

// Schema for subjects and environment
const subjectSchema = z.object({
  mainSubject: z.string().describe("Primary subject/character description"),
  pose: z.string().describe("Pose or action of the main subject"),
  scale: z.string().describe("Size/scale of the subject relative to frame"),
  secondaryElements: z.array(z.string()).optional().describe("Additional visual elements"),
});

const environmentSchema = z.object({
  setting: z.string().describe("Background setting or environment"),
  atmosphere: z.string().describe("Atmospheric effects or conditions"),
  timeOfDay: z.string().optional().describe("Time of day if relevant"),
  weather: z.string().optional().describe("Weather conditions if relevant"),
});

// Schema for typography and effects
const typographySchema = z.object({
  titleStyle: z.string().describe("Style for the movie title"),
  titlePlacement: z.string().describe("Where to place the title"),
  additionalText: z.array(z.string()).optional().describe("Other text elements"),
  fontStyle: z.string().describe("Font characteristics"),
});

const effectsSchema = z.object({
  specialEffects: z.array(z.string()).optional().describe("Visual effects to apply"),
  textureOverlay: z.string().optional().describe("Texture or overlay effects"),
  gradients: z.array(z.string()).optional().describe("Gradient effects if any"),
});

// Main poster data schema
export const posterDataSchema = z.object({
  visualStyle: visualStyleSchema,
  composition: compositionSchema,
  subject: subjectSchema,
  environment: environmentSchema,
  typography: typographySchema,
  effects: effectsSchema,
});

export type PosterData = z.infer<typeof posterDataSchema>;

// Helper type for the response from the LLM
export type PosterDataResponse = {
  success: boolean;
  data?: PosterData;
  error?: string;
}; 