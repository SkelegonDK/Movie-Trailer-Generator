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
    st.set_page_config(page_title="Movie Trailer Generator", layout="wide")
    st.title("Movie Trailer Generator")

    # Initialize configuration
    config = Config.load()

    # Initialize mode in session state if not present
    if "use_local_model" not in st.session_state:
        st.session_state.use_local_model = True

    # Sidebar for model selection and mode
    st.sidebar.header("Model Settings")

    # Mode toggle
    st.session_state.use_local_model = st.sidebar.toggle(
        "Use Local Models", value=st.session_state.use_local_model
    )

    if st.session_state.use_local_model:
        # Local Ollama models
        st.sidebar.subheader("Local Model Selection")
        ollama_models = functions.get_ollama_models()
        if not ollama_models:
            st.sidebar.error(
                "No Ollama models found. Please install Ollama and pull a model."
            )
            st.sidebar.markdown(
                "[Ollama Installation Instructions](https://ollama.com/)"
            )
            st.stop()
        else:
            default_model = (
                "llama3.2:3b" if "llama3.2:3b" in ollama_models else ollama_models[0]
            )
            selected_model = st.sidebar.selectbox(
                "Select Local Model",
                ollama_models,
                index=(
                    ollama_models.index(default_model)
                    if default_model in ollama_models
                    else 0
                ),
            )
            st.session_state.selected_model = selected_model
    else:
        # OpenRouter models
        st.sidebar.subheader("OpenRouter Model Selection")
        openrouter_models = [
            "deepseek/deepseek-chat-v3-0324:free",
            "mistralai/mistral-small-3.1-24b-instruct:free",
            "google/gemma-3-4b-it:free",
        ]
        default_openrouter_model = "deepseek/deepseek-chat-v3-0324:free"
        selected_model = st.sidebar.selectbox(
            "Select OpenRouter Model",
            openrouter_models,
            index=openrouter_models.index(default_openrouter_model),
        )
        st.session_state.selected_model = selected_model

        # Add model information
        st.sidebar.markdown(
            """
        **Available Free Models**
        - Gemma 7B Instruct: Best overall performance
        - Gemma 2B Instruct: Fastest response
        - Mistral 7B: Good balance of speed and quality
        - Nous Capybara 7B: Creative responses
        - OpenChat 7B: Good for conversation
        """
        )

        # Add API key instructions
        if not st.secrets.get("OPENROUTER_API_KEY"):
            st.sidebar.error(
                "OpenRouter API key not found in secrets. "
                "Please add your API key to the secrets."
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

            # --- Determine API parameters ---
            api_key = None
            base_url = None
            model_name_for_generation = None

            config = Config.load()

            if st.session_state.use_local_model:
                # Assume Ollama setup
                # Get base URL from config or env var if available, else default
                base_url = getattr(
                    config,
                    "ollama_base_url",
                    os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
                )
                # Ollama's OpenAI compatible endpoint often uses a placeholder key
                api_key = getattr(
                    config, "ollama_api_key", os.getenv("OLLAMA_API_KEY", "ollama")
                )
                # Get the specific local model name from session state
                model_name_for_generation = st.session_state.selected_model
            else:
                # Use OpenRouter
                base_url = "https://openrouter.ai/api/v1"
                api_key = config.openrouter_api_key
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


def generate_movie_name_with_openrouter(genre, model):
    """Generate a movie name using the OpenRouter API"""
    try:
        config = Config.load()
        client = OpenRouterClient(config)

        # Check API health first
        if not client.check_health():
            st.error("⚠️ OpenRouter API is currently unavailable")
            st.info(
                "Troubleshooting tips:\n"
                "1. Check if api.openrouter.ai is accessible\n"
                "2. Verify your API key is valid\n"
                "3. Try switching to local models temporarily"
            )
            return None

        # Format the prompt with all required elements
        prompt = prompts.MOVIE_TITLE_USER_PROMPT.format(
            genre=genre,
            main_character=st.session_state.selected_points["Main Character"],
            setting=st.session_state.selected_points["Setting"],
            conflict=st.session_state.selected_points["Conflict"],
            plot_twist=st.session_state.selected_points["Plot Twist"],
        )

        title = client.generate_text(
            prompt=prompt,
            model=model,
            system_prompt=prompts.MOVIE_TITLE_SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=100,
        )

        if not title:
            st.error("Received empty response from API")
            return None

        return title

    except ConnectionError as e:
        st.error(
            "⚠️ Connection Error: Unable to reach the API server. Please check your internet connection."
        )
        st.info(
            "Troubleshooting tips:\n"
            "1. Check your internet connection\n"
            "2. Verify that api.openrouter.ai is accessible\n"
            "3. Try again in a few moments"
        )
        st.write(f"Technical details: {str(e)}")
        return None

    except Timeout as e:
        st.error("⚠️ Request Timeout: The API server took too long to respond.")
        st.info(
            "The server might be experiencing high load. Please try again in a few moments."
        )
        st.write(f"Technical details: {str(e)}")
        return None

    except RequestException as e:
        st.error(
            "⚠️ API Error: Something went wrong while communicating with the server."
        )
        st.info("This could be a temporary issue. Please try again.")
        st.write(f"Technical details: {str(e)}")
        return None


def generate_script_with_openrouter(selected_points, movie_name):
    """Generate a movie trailer script using the OpenRouter API"""
    try:
        config = Config.load()
        client = OpenRouterClient(config)

        # Check API health first
        if not client.check_health():
            st.error("⚠️ OpenRouter API is currently unavailable")
            st.info(
                "Troubleshooting tips:\n"
                "1. Check if api.openrouter.ai is accessible\n"
                "2. Verify your API key is valid\n"
                "3. Try switching to local models temporarily"
            )
            return None

        prompt = prompts.SCRIPT_USER_PROMPT.format(
            title=movie_name,
            genre=selected_points["Genre"],
            setting=selected_points["Setting"],
            character=selected_points["Main Character"],
            conflict=selected_points["Conflict"],
            plot_twist=selected_points["Plot Twist"],
        )

        script = client.generate_text(
            prompt=prompt,
            model=st.session_state.selected_model,
            system_prompt=prompts.SCRIPT_SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=200,
        )

        if not script:
            st.error("Received empty script from API")
            return None

        return script

    except ConnectionError as e:
        st.error(
            "⚠️ Connection Error: Unable to reach the API server. Please check your internet connection."
        )
        st.info(
            "Troubleshooting tips:\n"
            "1. Check your internet connection\n"
            "2. Verify that api.openrouter.ai is accessible\n"
            "3. Try again in a few moments"
        )
        st.write(f"Technical details: {str(e)}")
        return None

    except Timeout as e:
        st.error("⚠️ Request Timeout: The API server took too long to respond.")
        st.info(
            "The server might be experiencing high load. Please try again in a few moments."
        )
        st.write(f"Technical details: {str(e)}")
        return None

    except RequestException as e:
        st.error(
            "⚠️ API Error: Something went wrong while communicating with the server."
        )
        st.info("This could be a temporary issue. Please try again.")
        st.write(f"Technical details: {str(e)}")
        return None


if __name__ == "__main__":
    main()
