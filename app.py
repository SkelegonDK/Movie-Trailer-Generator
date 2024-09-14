import os
import streamlit as st
import random
import requests
from datetime import datetime


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
                "Musical",
                "Claymation",
                "Noir",
                "Biography",
                "Superhero",
                "ASMR",
                "Existential Slapstick",
                "Cyberpunk",
                "Western",
                # Added monster-related and bad movie reference genres
                "Kaiju",
                "Disaster Movie",
                "The Room-esque Drama",
                "Godzilla vs. something",
                "Sitcom spinoff movie",
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
        <h3 style="color: #333; margin: 0; font-size: 1em;">{category}</h3>
        <p style="font-size: 1.2em; margin: 10px 0; font-weight: bold; color: #333;">{option}</p>
    </div>
    """,
        unsafe_allow_html=True,
    )


def generate_script_with_ollama(prompt):
    url = "http://localhost:11434/api/generate"
    data = {"model": "llama3.1:latest", "prompt": prompt, "stream": False}
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
        "voice_settings": {"stability": 0.7, "similarity_boost": 0.6},
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        st.error(f"Error generating audio: {str(e)}")
        return None


def save_audio_file(audio_content, selected_points):
    if not os.path.exists("generated_audio"):
        os.makedirs("generated_audio")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    elements = "_".join([point.replace(" ", "-") for point in selected_points.values()])
    filename = f"movie_trailer_{elements}_{timestamp}.mp3"
    filename = "".join(
        char for char in filename if char.isalnum() or char in ["_", "-", "."]
    )[:255]
    filepath = os.path.join("generated_audio", filename)

    with open(filepath, "wb") as f:
        f.write(audio_content)

    return filepath


def generate_with_llama3(prompt):
    url = "http://localhost:11434/api/generate"
    data = {"model": "llama3.1:latest", "prompt": prompt, "stream": False}
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json()["response"]
    else:
        st.error(f"Error generating content: {response.text}")
        return None


def generate_movie_name(script):
    prompt = f"""Based on the following movie trailer script, generate a catchy and appropriate movie title:

{script}

Guidelines:
- The title should be short and memorable (1-5 words)
- It should reflect the genre, tone, and main elements of the movie
- Be creative and avoid generic titles
- Do not use quotes or explanations, just provide the title
- Only output the title, no other text.

Title:"""

    return generate_with_llama3(prompt)


def generate_image_prompts(script, selected_points):
    prompt = f"""Based on the following movie trailer script and elements, create 5 detailed image prompts for key scenes in the movie:

Script:
{script}

Elements:
Genre: {selected_points['Genre']}
Setting: {selected_points['Setting']}
Main Character: {selected_points['Main Character']}
Conflict: {selected_points['Conflict']}
Plot Twist: {selected_points['Plot Twist']}

Guidelines:
- Each prompt should describe a vivid, cinematic scene from the movie
- Include details about characters, setting, action, and mood
- Make the scenes diverse, covering different parts of the movie's story
- Each prompt should be 1-2 sentences long
- Number each prompt (1-5)
- Do not use explanations or additional text, just provide the numbered prompts

Image Prompts:"""

    return generate_with_llama3(prompt)


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

    # Create three columns: one for the cards, one for the main content, and one for the audio browser
    card_col, main_col, audio_col = st.columns([1, 2, 1])

    # Cards column
    with card_col:
        st.subheader("Selected Elements")
        for point, color in zip(trailer_points, colors):
            category = point["category"]
            option = st.session_state.selected_points[category]
            card(category, option, color)

            if st.button(
                f"🎲 Randomize {category}",
                key=f"randomize_{category}",
                use_container_width=True,
            ):
                st.session_state.selected_points[category] = random.choice(
                    point["options"]
                )
                st.rerun()

        if st.button("🎲 Randomize All", use_container_width=True):
            st.session_state.selected_points = {
                point["category"]: random.choice(point["options"])
                for point in trailer_points
            }
            st.rerun()

    # Main content column
    with main_col:
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
                st.session_state.script_generated = True
            else:
                st.error("Failed to generate script. Please try again.")
                st.session_state.script_generated = False

        # Display the script if it exists
        if st.session_state.get("script_generated", False):
            st.text_area(
                "Generated Voice-Over Script",
                st.session_state.generated_script,
                height=200,
            )

            col1, col2 = st.columns(2)

            with col1:
                if st.button("Generate Movie Name"):
                    with st.spinner("Generating movie name..."):
                        movie_name = generate_movie_name(
                            st.session_state.generated_script
                        )
                    if movie_name:
                        st.session_state.movie_name = (
                            movie_name  # Save in session state
                        )
                        st.markdown(f"Generated Movie Name: {movie_name}")
                    else:
                        st.error("Failed to generate movie name. Please try again.")

            with col2:
                if st.button("Generate Image Prompts"):
                    with st.spinner("Generating image prompts..."):
                        image_prompts = generate_image_prompts(
                            st.session_state.generated_script,
                            st.session_state.selected_points,
                        )
                    if image_prompts:
                        st.session_state.image_prompts = (
                            image_prompts  # Save in session state
                        )
                        st.success("Image prompts generated successfully!")
                        st.text_area("Image Prompts", image_prompts, height=200)
                    else:
                        st.error("Failed to generate image prompts. Please try again.")

            if st.button("Generate Audio"):
                with st.spinner("Generating audio..."):
                    audio = generate_audio_with_elevenlabs(
                        st.session_state.generated_script
                    )
                if audio:
                    # Save the audio file
                    audio_file_path = save_audio_file(
                        audio, st.session_state.selected_points
                    )

                    # Play the audio
                    st.audio(audio, format="audio/mp3")

                    # Provide download button
                    with open(audio_file_path, "rb") as file:
                        st.download_button(
                            label="Download Audio",
                            data=file,
                            file_name=os.path.basename(audio_file_path),
                            mime="audio/mp3",
                        )

                    st.success(f"Audio saved to {audio_file_path}")
                else:
                    st.error("Failed to generate audio. Please try again.")

        with st.expander("Generated Audio Files"):
            st.subheader("Generated Audio Files")
            audio_files = [
                f for f in os.listdir("generated_audio") if f.endswith(".mp3")
            ]
            audio_files.sort(
                key=lambda x: os.path.getmtime(os.path.join("generated_audio", x)),
                reverse=True,
            )

            for audio_file in audio_files:
                audio_path = os.path.join("generated_audio", audio_file)
                st.markdown(f"**{audio_file}**")
                st.audio(audio_path, format="audio/mp3")

                with open(audio_path, "rb") as file:
                    st.download_button(
                        label="Download",
                        data=file,
                        file_name=audio_file,
                        mime="audio/mp3",
                    )


if __name__ == "__main__":
    main()
