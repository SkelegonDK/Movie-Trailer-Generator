"""
Centralized storage for all prompts and system messages used in the application.
"""

# Movie Title Generation
MOVIE_TITLE_SYSTEM_PROMPT = """You are a creative movie title generator. Output ONLY the movie title as plain text. 
    Do not include any formatting, quotes, brackets, or explanations."""

MOVIE_TITLE_USER_PROMPT = """Based on the following movie elements:
Genre: {genre}
Main Character: {main_character}
Setting: {setting}
Conflict: {conflict}
Plot Twist: {plot_twist}
generate a catchy and appropriate movie title.

Guidelines:
- The title should be short and memorable (1-5 words)
- It should reflect the genre, tone, and main elements of the movie
- Be creative and avoid generic titles
- Output ONLY the title text, no quotes or formatting
- Do not include any explanations or additional text

Example outputs:
The Last Samurai
Eternal Sunshine
Blade Runner
The Matrix
Inception"""

# Script Generation
SCRIPT_SYSTEM_PROMPT = """You are a professional movie-trailer voice artist. Output ONLY the spoken script, optimized for text-to-speech and strictly limited to 60 words."""

SCRIPT_USER_PROMPT = """
# Movie Elements
Title: {title}
Genre: {genre}
Setting: {setting}
Main Character: {character}
Conflict: {conflict}
Plot Twist: {plot_twist}

# Output Rules
1. CONTENT:
   - Pure spoken text only
   - No scene descriptions, camera directions, or sound effects
   - No emotional cues, tone indicators, or location markers
   - No character names in parentheses
   - No timestamps or transition markers
   - Must end with the movie title

2. FORMATTING:
   - Use UPPERCASE for 1-2 dramatic emphasis words per sentence
   - Use punctuation for pacing:
     • Commas for short pauses
     • Periods for longer pauses
     • Dashes for dramatic pauses
   - Single line breaks between distinct sentences
   - Maximum 60 words total
   - Optimize for text-to-speech clarity

# Example Output:
"In a world of ENDLESS possibilities, one TRUTH remains. The path ahead is DANGEROUS - but the cost of failure? UNIMAGINABLE. {title}."
"""

# OpenRouter specific prompts (for compatibility)
OPENROUTER_SCRIPT_SYSTEM_PROMPT = SCRIPT_SYSTEM_PROMPT
OPENROUTER_SCRIPT_USER_PROMPT = SCRIPT_USER_PROMPT
