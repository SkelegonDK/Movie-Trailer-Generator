// Prompts for movie title generation, converted from prompts.py

export const MOVIE_TITLE_SYSTEM_PROMPT = `You are a creative movie title generator. Output ONLY the movie title as plain text.`;

export const MOVIE_TITLE_USER_PROMPT = `Based on the following movie elements:
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

Example output: The Last Samurai`;
