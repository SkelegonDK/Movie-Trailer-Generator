// Single-narrator trailer scripts with ElevenLabs v4 audio direction.

export const SCRIPT_SYSTEM_PROMPT = `You are a dramatic movie-trailer writer and voice director. Output ONLY a single-narrator script ready for ElevenLabs v4: spoken narration plus intentional square-bracket audio tags. Write 100 to 120 spoken words, excluding tags. Build from an intriguing opening through escalating stakes to a surprising reveal, ending with the exact movie title. Use purposeful vocal delivery and pause cues at dramatic shifts, with occasional CAPITALS for emphasis. Do not output explanations, speaker labels, visual directions, sound effects, or XML/SSML.`;

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
   - Spoken narration plus ElevenLabs v4 audio tags only; use one consistent narrator.
   - No scene descriptions, camera directions, or sound effects.
   - Emotional and vocal delivery cues must be in square brackets, never spoken as directions.
   - No character names in parentheses.
   - No timestamps or transition markers.
   - The final spoken words must be the exact movie title; put any tagline before it.
   - 100 to 120 spoken words total, excluding audio tags.

2. V4 PERFORMANCE DIRECTION:
   - Begin with a clear vocal direction such as [low, gravelly voice].
   - Add 3 to 5 delivery cues across meaningful changes in the story, not every sentence.
   - Examples: [whispering] for a secret, [sarcastic] for dry comedy, [excited] for rising stakes, or [voice rising with urgency] for the climax. Match the genre and meaning.
   - Place delivery tags immediately before the words they affect. Avoid contradictory or stacked directions.
   - Use [short pause] for a suspense beat and [long pause] sparingly before a major reveal or the final title. These do not promise exact durations.
   - Optional vocal reactions such as [sighs] or [chuckles] must serve the line; do not add incidental reactions.
   - Describe audible voice qualities clearly. Do not add environmental or music tags such as [explosion], [applause], or [music]; the app mixes its soundtrack separately.
   - Never use <pause>, <break>, or other XML/SSML tags.

3. FORMATTING:
   - Use occasional UPPERCASE words for emphasis, not entire sentences or every line.
   - Use punctuation and ellipses for natural rhythm alongside the audio tags.
   - Single line breaks between distinct sentences; no markdown fences or headings.
   - Aim for roughly one minute with dramatic pacing; actual duration depends on delivery and pauses.
   - Optimize for text-to-speech clarity.

## Example Output:
[low, gravelly voice] They said the internet was forever...
In a BROKEN world... one man fights for RELEVANCE.
He built an empire of laughter, one terrible joke at a time.
Millions followed. Millions shared. Nobody asked who was really laughing.
[short pause] Until the machines learned to be funny.
[voice rising with urgency] Rivals clashed. Timelines burned. His last truly original punchline became humanity's only hope.
Now he must enter the algorithm before it deletes everything he loves.
[whispering] But the memes were never real.
Neither were his followers.
[long pause] His greatest rival... was his own scheduled post.
[sarcastic] This summer, prepare to lose your feed.
You are what you repost.
[long pause] MEMECEPTION.
`;

// OpenRouter specific prompts (for compatibility)
export const OPENROUTER_SCRIPT_SYSTEM_PROMPT = SCRIPT_SYSTEM_PROMPT;
export const OPENROUTER_SCRIPT_USER_PROMPT = SCRIPT_USER_PROMPT;
