import os
import random
import json
import requests
from scripts.openrouter_client import OpenRouterClient
from requests.exceptions import RequestException, ConnectionError, Timeout
from config import Config
from utils.llm_api import call_llm

import streamlit as st
from scripts import functions, prompts


def main():
    """
    Runs the main Streamlit application for the Movie Trailer Generator.

    Sets up the page configuration, title, sidebar for model selection,
    API key checks, and lays out the UI elements including selection cards,
    generation buttons, script display, and audio playback/download.
    Handles the logic for generating movie names and scripts using the
    selected LLM via OpenRouter and generating voice-overs using ElevenLabs.
    """
    st.set_page_config(page_title="Movie Trailer Generator", layout="wide")
    st.title("Movie Trailer Generator")

    # Initialize configuration
    config = Config.load()

    # Sidebar for model selection and mode
    st.sidebar.header("Model Settings")

    # OpenRouter models (Now the only path)
    st.sidebar.subheader("OpenRouter Model Selection")
    # Get models and default from config
    openrouter_models = config.openrouter_model_list
    default_openrouter_model = config.openrouter_default_model

    # Ensure the default model is in the list, handle potential None
    if (
        not default_openrouter_model
        or default_openrouter_model not in openrouter_models
    ):
        # Fallback to the first model in the list if default is invalid or not set
        if openrouter_models:
            default_openrouter_model = openrouter_models[0]
        else:
            # Handle case where model list is empty in config
            st.sidebar.error("No OpenRouter models configured. Please check config.")
            st.stop()

    # Determine the index for the default model
    default_index = openrouter_models.index(default_openrouter_model)

    selected_model = st.sidebar.selectbox(
        "Select OpenRouter Model",
        openrouter_models,
        index=default_index,
    )
    # Store selected model directly
    st.session_state.selected_model = selected_model

    # Add model information dynamically
    st.sidebar.markdown("**Available Configured Models**")
    for model_name in openrouter_models:
        st.sidebar.markdown(f"- `{model_name}`")

    # Add API key instructions
    # Check the key from the loaded config object
    if not config.openrouter_api_key:
        st.sidebar.error(
            "OpenRouter API key not found. "
            "Please configure it via environment variables or secrets.toml."
        )
        st.sidebar.markdown("[Get Free API Key](https://openrouter.ai/keys)")
        st.stop()

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
            st.session_state.script_generated = False
            st.session_state.generated_script = None
            st.session_state.movie_name = None

            # Use OpenRouter (Now the only path)
            base_url = "https://openrouter.ai/api/v1"
            # Get API key from the loaded config object
            api_key = config.openrouter_api_key
            # Get selected model from session state (set earlier)
            model_name_for_generation = st.session_state.selected_model

            # Basic validation of parameters
            if not api_key or not base_url or not model_name_for_generation:
                st.error(
                    "API Key, Base URL, or Model Name is missing. Please check configuration."
                )
            else:
                # --- First LLM Call (Movie Name) using call_llm ---
                movie_name = None
                try:
                    with st.spinner("Generating movie name..."):
                        # Prepare the prompt for movie name generation
                        movie_name_prompt = prompts.MOVIE_TITLE_USER_PROMPT.format(
                            genre=st.session_state.selected_points["Genre"],
                            main_character=st.session_state.selected_points[
                                "Main Character"
                            ],
                            setting=st.session_state.selected_points["Setting"],
                            conflict=st.session_state.selected_points["Conflict"],
                            plot_twist=st.session_state.selected_points["Plot Twist"],
                        )

                        movie_name = call_llm(
                            model_name=model_name_for_generation,
                            prompt=movie_name_prompt,
                            api_key=api_key,
                            base_url=base_url,
                            temperature=0.7,
                            max_tokens=50,
                        )
                except Exception as e:
                    st.error(f"Error generating movie name: {e}")
                    st.stop()

                # --- Check Movie Name ---
                if movie_name and isinstance(movie_name, str):
                    # Clean up potential quotes or extra whitespace
                    st.session_state.movie_name = movie_name.strip().replace('"', "")
                    st.success(f"Generated Movie Name: {st.session_state.movie_name}")

                    # --- Second LLM Call (Script) using call_llm ---
                    script = None
                    try:
                        with st.spinner("Generating voice-over script..."):
                            # Prepare the prompt for script generation
                            # Ensure keys match the placeholders in prompts.SCRIPT_USER_PROMPT
                            script_prompt_args = {
                                "title": st.session_state.movie_name,  # Use 'title' key
                                "genre": st.session_state.selected_points["Genre"],
                                "setting": st.session_state.selected_points["Setting"],
                                "character": st.session_state.selected_points[
                                    "Main Character"
                                ],  # Use 'character' key
                                "conflict": st.session_state.selected_points[
                                    "Conflict"
                                ],
                                "plot_twist": st.session_state.selected_points[
                                    "Plot Twist"
                                ],
                            }
                            script_prompt = prompts.SCRIPT_USER_PROMPT.format(
                                **script_prompt_args
                            )

                            script = call_llm(
                                model_name=model_name_for_generation,
                                prompt=script_prompt,
                                api_key=api_key,
                                base_url=base_url,
                                temperature=0.7,
                                max_tokens=500,
                            )
                    except KeyError as e:
                        st.error(
                            f"Error formatting script prompt: Missing key {e}. Check prompts.py and app.py alignment."
                        )
                        # Optionally add st.stop() here if this is critical
                    except Exception as e:
                        st.error(f"Error generating script: {e}")

                    # --- Process Script ---
                    if script:
                        formatted_script = "\n\n".join(
                            [
                                line.strip()
                                for line in script.split("\n")
                                if line.strip()
                            ]
                        )
                        st.session_state.generated_script = formatted_script
                        st.session_state.script_generated = True
                    else:
                        # Error message was already shown in the except block if script generation failed
                        # If script is None/empty without an exception, show a generic message
                        if movie_name:
                            st.warning(
                                "Script generation returned empty. Try adjusting parameters or regenerating."
                            )
                        st.session_state.script_generated = False
                else:
                    # Error message was already shown in the except block if name generation failed
                    # If name is None/empty without an exception, show a generic message
                    st.warning(
                        "Movie name generation returned empty. Please try again."
                    )

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
                else:
                    st.error("Failed to generate audio. Please try again.")

        # Note about Audio Browser
        st.markdown("---")
        st.info(
            "👉 Check out the Audio Browser page to view all generated audio files!"
        )


if __name__ == "__main__":
    main()
