import os
import random

import streamlit as st
from scripts import functions


def main():
    st.set_page_config(page_title="Movie Trailer Generator", layout="wide")
    st.title("Movie Trailer Generator")

    # Sidebar for Ollama model selection
    st.sidebar.header("Ollama Model Selection")
    ollama_models = functions.get_ollama_models()
    if not ollama_models:
        st.sidebar.error(
            "No Ollama models found. Please install Ollama and pull a model."
        )
        st.sidebar.markdown("[Ollama Installation Instructions](https://ollama.com/)")
        st.stop()
    else:
        default_model = (
            "llama3.2:3b" if "llama3.2:3b" in ollama_models else ollama_models[0]
        )
        selected_model = st.sidebar.selectbox(
            "Select Ollama Model",
            ollama_models,
            index=(
                ollama_models.index(default_model)
                if default_model in ollama_models
                else 0
            ),
        )
        st.session_state.selected_model = selected_model
    st.write("by Manuel Thomsen")

    trailer_points = functions.get_trailer_points()
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
    card_col, main_col, empty_col = st.columns([1, 2, 1])

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
                functions.card(category, custom_element, color)
            else:
                # Random mode: use random elements
                option = st.session_state.selected_points[category]
                functions.card(category, option, color)
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
                movie_name_response = functions.generate_movie_name_with_id(
                    st.session_state.selected_points["Genre"],
                    st.session_state.selected_points["Main Character"],
                    st.session_state.selected_points["Setting"],
                    st.session_state.selected_points["Conflict"],
                    st.session_state.selected_points["Plot Twist"],
                )
            if movie_name_response:
                st.session_state.movie_name = movie_name_response.get("movie_name", "")
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

                Output format:
                - Pure spoken text.
                - use only UPPERCASE for emphasis on specific words. Example: "it's NOW or NEVER".
                - between 100 and 150 words.
                - Line breaks only between distinct sentences.
                - comma for short pauses, periods for longer pauses and dashes for dramatic pauses. example: "I'm going to the store - I'll be back in 30 minutes"
                """

            with st.spinner("Generating voice-over script..."):
                script = functions.generate_script_with_ollama(prompt)

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
                    audio = functions.generate_audio_with_elevenlabs(
                        st.session_state.generated_script
                    )
                if audio:
                    # Save the audio file
                    audio_file_path = functions.save_audio_file(
                        audio,
                        st.session_state.selected_points,
                        st.session_state.movie_name,
                    )

                    # Apply background music
                    audio_with_music_path = functions.apply_background_music(
                        audio_file_path
                    )
                    if audio_with_music_path:
                        st.audio(audio_with_music_path, format="audio/mp3")
                        with open(audio_with_music_path, "rb") as file:
                            st.download_button(
                                label="Download",
                                data=file,
                                file_name=os.path.basename(audio_with_music_path),
                                mime="audio/mp3",
                            )
                    else:
                        st.error("Failed to apply background music. Please try again.")

                    st.audio(audio_with_music_path, format="audio/mp3")
                    with open(audio_with_music_path, "rb") as file:
                        st.download_button(
                            label="Download",
                            data=file,
                            file_name=os.path.basename(audio_with_music_path),
                            mime="audio/mp3",
                        )
                else:
                    st.error("Failed to generate audio. Please try again.")

        # Note about Audio Browser
        st.markdown("---")
        st.info(
            "👉 Check out the Audio Browser page to view all generated audio files!"
        )


if __name__ == "__main__":
    main()
