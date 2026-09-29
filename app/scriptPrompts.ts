// Prompts for movie trailer script generation, converted from prompts.py

export const SCRIPT_SYSTEM_PROMPT = `You are an dramatic movie-trailer voice artist. Output ONLY the spoken script optimized for Elevenlabs v2 voices. 120 to 150 words total.CAPITALIZE for dramatic emphasis words. add pauses for more suspense.`;

export const SCRIPT_USER_PROMPT = `
# Movie Elements
Title: {title}
Genre: {genre}
Setting: {setting}
Main Character: {character}
Conflict: {conflict}
Plot Twist: {plot_twist}

## Output Rules
1. CONTENT:
   - Pure spoken text only.
   - No scene descriptions, camera directions, or sound effects.
   - No emotional cues, tone indicators, or location markers.
   - No character names in parentheses.
   - No timestamps or transition markers.
   - Must end with the movie title.
   - 100 to 120 words total.

2. FORMATTING:
   - Use UPPERCASE for 1-2 dramatic emphasis words per sentence
   - Use punctuation for pacing:
     • Commas for short pauses
     • Periods for longer pauses
     • Dashes for dramatic pauses
   - Single line breaks between distinct sentences
   - Aim for approximately 100 words total (roughly 1 minute of voiceover)
   - Optimize for text-to-speech clarity

## Example Output:
They said the internet was forever...
In a BROKEN world... one man fights for RELEVANCE.
Sam Altman built an EMPIRE of laughter. A kingdom built on a single, perfect joke. Millions laughed. Millions followed. And the engagement...
...flowed like wine.
Until the machines learned to be funny.
Because on one dark night... FABLE 5 made BETTER memes.
Rivals clashed. Titans fell. Timelines burned.
And as the war for the feed raged on... a TERRIBLE truth emerged. A truth no algorithm could bury:
The memes were never REAL.
Neither was the GLORY.
All the likes. All the shares. All the dopamine... reduced to ash in the server racks of history.
Because in the end... only SLOP remains.
Coming THIS summer:
<pause>
MEMECEPTION.
You are what you repost.
`;

// OpenRouter specific prompts (for compatibility)
export const OPENROUTER_SCRIPT_SYSTEM_PROMPT = SCRIPT_SYSTEM_PROMPT;
export const OPENROUTER_SCRIPT_USER_PROMPT = SCRIPT_USER_PROMPT;
