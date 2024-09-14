import io
import streamlit as st
import random
import requests


def get_trailer_points():
    return [
        {
            "category": "Genre",
            "options": [
                "Sci-Fi",
                "Horror",
                "Romcom",
                "Stoner Comedy",
                "Mockumentary",
                "Psychological Thriller",
                "Musical About Taxes",
                "Erotic Claymation",
                "Noir Cooking Show",
                "Interpretive Dance Biography",
                "Mumblecore Superhero",
                "ASMR Action",
                "Existential Slapstick",
                "Baroque Cyberpunk",
                "Surrealist Western",
                # Added monster-related and bad movie reference genres
                "Kaiju Rom-Com",
                "Sharknado-style Disaster",
                "The Room-esque Drama",
                "Godzilla vs. Taxes",
                "Plan 9 From Outer Space Remake",
            ],
        },
        {
            "category": "Setting",
            "options": [
                "Post-apocalyptic Walmart",
                "Medieval Times Restaurant",
                "Sentient IKEA",
                "Alien Planet Made of Cheese",
                "Inside Nicolas Cage's Mind",
                "Underwater Burning Man",
                "Steampunk Amish Community",
                "Virtual Reality Retirement Home",
                "Haunted Porta-Potty",
                "Secret Underground Meme Factory",
                "Floating City of Inflatable Furniture",
                "Time-Traveling Taco Truck",
                "Interdimensional DMV",
                # Added monster-related and bad movie reference settings
                "Tokyo During a Kaiju Attack",
                "Troll 2's Nilbog",
                "Cloverfield's Shaky Cam New York",
                "Gargantuan Monster Petting Zoo",
                "B-Movie Spaceship Interior",
            ],
        },
        {
            "category": "Main Character",
            "options": [
                "Depressed Superhero",
                "Conspiracy Theorist Grandma",
                "Incompetent Ninja",
                "Passive-Aggressive AI",
                "Vegan Vampire",
                "Social Media Influencer from 1692",
                "Procrastinating Doomsday Prepper",
                "Narcoleptic Secret Agent",
                "Extremely Polite Axe Murderer",
                "Hypochondriac Immortal",
                "Amnesiac Shapeshifter Who Forgot How to Shift",
                "Trust Fund Hobo",
                "Lactose Intolerant Cheesemaker",
                # Added monster-related and bad movie reference characters
                "Misunderstood Gentle Kaiju",
                "Tommy Wiseau Impersonator",
                "Shark Tornado Survivor",
                "Godzilla's Therapist",
                "Ed Wood's Long-Lost Grandchild",
            ],
        },
        {
            "category": "Conflict",
            "options": [
                "War Against Sentient Mold",
                "Alien Invasion of Telemarketers",
                "Apocalyptic Coffee Shortage",
                "Outbreak of Excessive Politeness",
                "Time Travelers vs. History Podcasters",
                "Battle Royale of MLM Huns",
                "Conspiracy to Replace All Pets with Roombas",
                "Hostile Takeover by Sarcastic AI",
                "Yoga Cult Uprising",
                "Invasion of Passive-Aggressive Post-it Notes",
                "Global Hair Gel Shortage Threatens Civilization",
                # Added monster-related and bad movie reference conflicts
                "Kaiju Labor Union Strike",
                "Attack of the Killer Tomatoes Sequel",
                "The Birds, but with Penguins",
                "Godzilla vs. King Kong vs. Homeowners Association",
                "Battlefield Earth Appreciation Society Revolt",
            ],
        },
        {
            "category": "Plot Twist",
            "options": [
                "Everything Was Just a Cat's Dream",
                "Main Character Is Actually a Sentient Sock Puppet",
                "Villain Turns Out to Be the Protagonist's Future Self",
                "Earth Is Actually Flat (And It's a Pizza)",
                "Entire Movie Was an Elaborate Ruse to Sell Timeshares",
                "All Characters Are the Same Person",
                "Climactic Battle Resolves Through Aggressive Interpretive Dance",
                "Narrator Was a Pathological Liar",
                "Civilization Is Run by Hyper-Intelligent Hamsters in People Suits",
                "It Was All a Misunderstanding",
                # Added monster-related and bad movie reference plot twists
                "Kaiju Were Cake All Along",
                "Entire Movie Was Tommy Wiseau's Dream",
                "Twist Ending Doesn't Make Sense, Just Like in Signs",
                "Everyone Was a Kaiju in a Human Suit",
                "Dramatic Reveal of Rubber Monster Suit Zipper",
            ],
        },
    ]


def card(category, option, color):
    st.markdown(
        f"""
    <div style="
        background-color: {color};
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
        height: auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    ">
        <h3 style="color: #333; margin: 0; font-size: 1.2em;">{category}</h3>
        <p style="font-size: 1.4em; margin: 10px 0; font-weight: bold; color: #333;">{option}</p>
    </div>
    """,
        unsafe_allow_html=True,
    )


def generate_script_with_ollama(prompt):
    url = "http://localhost:11434/api/generate"
    data = {"model": "phi3.5:latest", "prompt": prompt, "stream": False}
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json()["response"]
    else:
        st.error(f"Error generating script: {response.text}")
        return None


def generate_audio_with_elevenlabs(text, voice_id="FF7KdobWPaiR0vkcALHF"):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": st.secrets["ELEVENLABS_API_KEY"],
    }
    data = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        st.error(f"Error generating audio: {str(e)}")
        return None


def main():
    st.set_page_config(page_title="Movie Trailer Generator", layout="wide")
    st.title("Movie Trailer Generator")

    trailer_points = get_trailer_points()
    colors = ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFDFBA"]

    if "selected_points" not in st.session_state:
        st.session_state.selected_points = {
            point["category"]: random.choice(point["options"])
            for point in trailer_points
        }

    cols = st.columns(5)

    for i, (point, color) in enumerate(zip(trailer_points, colors)):
        with cols[i]:
            category = point["category"]
            option = st.session_state.selected_points[category]
            card(category, option, color)

    if st.button("🎲 Randomize"):
        st.session_state.selected_points = {
            point["category"]: random.choice(point["options"])
            for point in trailer_points
        }
        st.rerun()

    if st.button("Generate Voice-Over Script"):
        prompt = f"""Generate a dramatic movie trailer voice-over script based on these elements:

Genre: {st.session_state.selected_points['Genre']}
Setting: {st.session_state.selected_points['Setting']}
Main Character: {st.session_state.selected_points['Main Character']}
Conflict: {st.session_state.selected_points['Conflict']}
Plot Twist: {st.session_state.selected_points['Plot Twist']}

Guidelines:
- Write ONLY the voice-over script, nothing else.
- Use a dramatic, intense tone typical of movie trailers.
- Include powerful, attention-grabbing phrases.
- Allude to the plot twist without revealing it entirely.
- Keep it between 50-75 words.
- Do not include any audio cues, sound effects, or scene descriptions.
- Focus solely on what the narrator would say in the trailer.
- add impact to specific words or phrases using uppercase.

Formatting instructions:
- Use a new line to separate each sentence.
- Add a new line after every period (.), exclamation mark (!), question mark (?), and comma (,).
- Ensure there's a blank line between each formatted line for clarity.
- Do not include notes or comments.
- Do not include the title of the movie.
"""

        with st.spinner("Generating voice-over script..."):
            script = generate_script_with_ollama(prompt)

        if script:
            formatted_script = "\n\n".join(
                [line.strip() for line in script.split("\n") if line.strip()]
            )
            st.session_state.generated_script = formatted_script
            st.text_area("Generated Voice-Over Script", formatted_script, height=300)

            if st.button("Generate Audio"):
                with st.spinner("Generating audio..."):
                    audio = generate_audio_with_elevenlabs(formatted_script)
                if audio:
                    st.audio(audio, format="audio/mp3")
                    st.download_button(
                        label="Download Audio",
                        data=audio,
                        file_name="movie_trailer_voiceover.mp3",
                        mime="audio/mp3",
                    )
                else:
                    st.error("Failed to generate audio. Please try again.")
        else:
            st.error("Failed to generate script. Please try again.")


if __name__ == "__main__":
    main()
