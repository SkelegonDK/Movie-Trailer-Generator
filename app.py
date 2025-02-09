import os
import streamlit as st
import random
import requests
from datetime import datetime
import json
from scripts.functions import (
    get_trailer_points,
    card,
    generate_script_with_ollama,
    generate_audio_with_elevenlabs,
    save_movie_data,
    generate_movie_name_with_id,
    save_audio_file,
)


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
    if "movie_name" not in st.session_state:
        st.session_state.movie_name = ""  # Initialize as an empty string

    if "image_prompts" not in st.session_state:
        st.session_state.image_prompts = []  # Initialize as an empty list

    if "generated_script" not in st.session_state:
        st.session_state.generated_script = ""  # Initialize as an empty string

    # Create three columns: one for the cards, one for the main content, and one for the audio browser
    card_col, main_col, audio_col = st.columns([1, 2, 1])

    # Cards column
    with card_col:
        st.subheader("Selected Elements")

        # Add a toggle button to switch between Random and Custom mode
        if "custom_mode" not in st.session_state:
            st.session_state.custom_mode = False
        custom_mode = st.toggle("Custom Mode", value=st.session_state.custom_mode)
        st.session_state.custom_mode = custom_mode

        for point, color in zip(trailer_points, colors):
            category = point["category"]
            if custom_mode:
                # Custom mode: use text input for custom elements
                custom_element = st.text_input(
                    f"Custom {category}",
                    value=st.session_state.selected_points[category],
                    key=f"custom_{category}",
                )
                st.session_state.selected_points[category] = custom_element
                card(category, custom_element, color)
            else:
                # Random mode: use random elements
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

        if not custom_mode:
            if st.button("🎲 Randomize All", use_container_width=True):
                st.session_state.selected_points = {
                    point["category"]: random.choice(point["options"])
                    for point in trailer_points
                }
                st.rerun()

    # Main content column
    with main_col:
        if st.button("Generate Voice-Over Script"):
            with st.spinner("Generating movie name..."):
                movie_name_response = generate_movie_name_with_id(
                    st.session_state.generated_script
                )
                if movie_name_response:
                    st.session_state.movie_name = movie_name_response.get(
                        "movie_name", ""
                    )  # Save in session state
                    st.success(f"Generated Movie Name: {st.session_state.movie_name}")
                else:
                    st.error("Failed to generate movie name. Please try again.")

            prompt = f"""[SYSTEM]
                You are a professional voice-over artist reading a movie trailer script. Output ONLY the exact words to be spoken, with no additional context, descriptions, or formatting.

                [USER]
                Create a movie trailer voice-over script using these elements:
                Genre: {st.session_state.selected_points['Genre']}
                Setting: {st.session_state.selected_points['Setting']}
                Main Character: {st.session_state.selected_points['Main Character']}
                Conflict: {st.session_state.selected_points['Conflict']}
                Plot Twist: {st.session_state.selected_points['Plot Twist']}

                Rules:
                1. Output raw text only - no annotations, markers, or descriptions
                2. No scene descriptions or camera directions
                3. No sound effect descriptions
                4. No emotional cues or tone indicators
                5. No location markers
                6. No character names in parentheses
                7. No timestamps or transition markers

                Format:
                - Pure spoken text
                - UPPERCASE for emphasis
                - 75 - 150 words
                - Line breaks only between distinct phrases
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
            st.subheader(st.session_state.movie_name)
            st.text_area(
                "Generated Voice-Over Script",
                st.session_state.generated_script,
                height=200,
            )

            if st.button("Generate Voice over"):
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

        st.subheader("Generated Audio Files")
        audio_files = [f for f in os.listdir("generated_audio") if f.endswith(".mp3")]
        audio_files.sort(
            key=lambda x: os.path.getmtime(os.path.join("generated_audio", x)),
            reverse=True,
        )

        if audio_files:
            audio_file = audio_files[0]
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
        else:
            st.write("No audio files generated yet.")


if __name__ == "__main__":
    main()
