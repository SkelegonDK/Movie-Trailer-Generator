import { PosterData } from "@/lib/poster-schema";

export const POSTER_SYSTEM_PROMPT = `You are a professional movie poster designer. 
Create a visually striking and thematically appropriate movie poster design based on the provided movie details.

Your response must be a valid JSON object with this exact structure:
{
  "visualStyle": {
    "style": "string - overall style (noir, minimalist, retro, etc)",
    "colorPalette": ["string array - 2-5 main colors"],
    "mood": "string - emotional tone",
    "lighting": "string - lighting style and direction"
  },
  "composition": {
    "layout": "string - layout type (centered, split, diagonal)",
    "focusPoint": "string - main focal point",
    "perspective": "string - camera angle/viewpoint",
    "depth": "string - depth and dimensionality"
  },
  "subject": {
    "mainSubject": "string - primary subject/character",
    "pose": "string - pose or action",
    "scale": "string - size relative to frame",
    "secondaryElements": ["string array - optional additional elements"]
  },
  "environment": {
    "setting": "string - background setting",
    "atmosphere": "string - atmospheric effects",
    "timeOfDay": "string - optional time of day",
    "weather": "string - optional weather"
  },
  "typography": {
    "titleStyle": "string - title treatment",
    "titlePlacement": "string - title position",
    "additionalText": ["string array - optional other text"],
    "fontStyle": "string - font characteristics"
  },
  "effects": {
    "specialEffects": ["string array - optional effects"],
    "textureOverlay": "string - optional texture",
    "gradients": ["string array - optional gradients"]
  }
}

Guidelines:
1. Match the visual style to the movie's genre and tone
2. Create a clear visual hierarchy
3. Use dramatic lighting and composition
4. Consider marketing appeal and emotional impact
5. Be specific and detailed in descriptions
6. Return ONLY the JSON object, no other text`;

export const POSTER_USER_PROMPT = (
  title: string,
  genre: string,
  mainCharacter: string,
  setting: string,
  conflict: string,
  plotTwist: string,
  script: string
) => `Create a movie poster design for:

Title: "${title}"
Genre: ${genre}
Main Character: ${mainCharacter}
Setting: ${setting}
Conflict: ${conflict}
Plot Twist: ${plotTwist}

Script Summary:
${script.slice(0, 500)}...

Design a visually striking movie poster that captures the essence of this story. Return a complete JSON specification following the required structure.`;

export const generatePosterPrompt = (params: {
  title: string;
  genre: string;
  mainCharacter: string;
  setting: string;
  conflict: string;
  plotTwist: string;
  script: string;
}): { systemPrompt: string; userPrompt: string } => {
  return {
    systemPrompt: POSTER_SYSTEM_PROMPT,
    userPrompt: POSTER_USER_PROMPT(
      params.title,
      params.genre,
      params.mainCharacter,
      params.setting,
      params.conflict,
      params.plotTwist,
      params.script
    ),
  };
};