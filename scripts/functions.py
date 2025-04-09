import os
import json
import uuid
from datetime import datetime
from typing import Any
import subprocess
import requests
import streamlit as st
from scripts import prompts
import time
from datetime import timedelta
import hashlib


try:
    from pydub import AudioSegment
    from pydub.effects import speedup
except ImportError:
    AudioSegment = Any  # type: ignore
    speedup = Any  # type: ignore


def get_trailer_points():
    """
    Retrieves trailer elements from JSON files in the assets/data directory.

    Returns:
        list: A list of dictionaries, where each dictionary represents a trailer element
              (genre, main_character, setting, conflict, plot_twist) and contains
              its category and options.
    """
    category_order = ["genre", "main_character", "setting", "conflict", "plot_twist"]
    trailer_points = []
    data_dir = "assets/data"

    for category in category_order:
        filename = f"{category}.json"
        with open(os.path.join(data_dir, filename), "r", encoding="utf-8") as f:
            trailer_points.append(json.load(f))

    return trailer_points


@st.cache_data
def card(category, option, color):
    """
    Displays a card with a category and option.

    Args:
        category (str): The category of the card.
        option (str): The option to display on the card.
        color (str): The background color of the card.
    """
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


def generate_audio_with_elevenlabs(text, voice_id="FF7KdobWPaiR0vkcALHF"):
    """
    Generates audio from text using the ElevenLabs Text-to-Speech API.
    Includes caching and request tracking to prevent duplicate API calls.

    Args:
        text (str): The text content to convert to speech.
        voice_id (str, optional): The ElevenLabs voice ID to use.
                                  Defaults to "FF7KdobWPaiR0vkcALHF".

    Returns:
        Optional[bytes]: The generated audio content as bytes in MP3 format,
                         or None if an error occurred during generation.
    """
    # Check if voice generation is requested
    if not st.session_state.get("voice_generation_requested", False):
        return None

    # Check for API key
    if not st.secrets.get("ELEVENLABS_API_KEY"):
        st.error(
            "ElevenLabs API key not found. Please configure it via secrets.toml or environment variable."
        )
        return None

    # Generate cache key based on text and voice_id
    cache_key = hashlib.md5(f"{text}{voice_id}".encode()).hexdigest()

    # Check if we have this audio cached
    if "audio_cache" not in st.session_state:
        st.session_state.audio_cache = {}

    if cache_key in st.session_state.audio_cache:
        return st.session_state.audio_cache[cache_key]

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": st.secrets.get("ELEVENLABS_API_KEY"),
    }
    data = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.7, "similarity_boost": 0.6},
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=60)
        response.raise_for_status()
        audio_content = response.content

        # Cache the generated audio
        st.session_state.audio_cache[cache_key] = audio_content

        return audio_content
    except requests.exceptions.RequestException as e:
        st.error(
            f"Error generating audio via ElevenLabs: {str(e)}. Check API key and network."
        )
        return None


def save_audio_file(audio_content, selected_points, movie_name):
    """Save voice-over audio with descriptive filename.

    Args:
        audio_content (bytes): The audio content to save
        selected_points (dict): Dictionary of selected trailer elements
        movie_name (str): Name of the movie

    Returns:
        str: Path to saved audio file
    """
    os.makedirs("generated_audio", exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"voiceover_{movie_name}_{timestamp}.mp3"
    filepath = os.path.join("generated_audio", filename)

    with open(filepath, "wb") as f:
        f.write(audio_content)
    return filepath


def save_movie_data(movie_name, script, output_dir="assets/data"):
    """
    Saves the movie data (name and script) to a JSON file in the assets/data directory.

    Args:
        movie_name (str): The name of the movie.
        script (str): The movie trailer script.
        output_dir (str, optional): The directory to save the movie data to. Defaults to "assets/data".

    Returns:
        str: The filepath of the saved movie data file.
    """
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Create the data structure
    movie_data = {
        "movie_name": movie_name,
        "script": script,
    }

    # Save movie data
    movie_data_file = os.path.join(output_dir, "movie_data.json")
    with open(movie_data_file, "w") as f:
        json.dump(movie_data, f, indent=4)  # Use indent for pretty printing

    return movie_data_file  # Return file path for confirmation


def apply_background_music(audio_filepath):
    """Mix voice-over with background music, stretching music to match voice-over length.

    Args:
        audio_filepath (str): Path to voice-over audio file

    Returns:
        str: Path to mixed audio file
    """
    try:
        voice_over = AudioSegment.from_mp3(audio_filepath)
        background = AudioSegment.from_mp3("assets/audio/trailer_music.mp3")

        # Stretch background music to match voice-over length
        ratio = len(voice_over) / len(background)
        if ratio > 1:
            # If voice-over is longer, slow down the background music
            stretched = background._spawn(
                background.raw_data,
                overrides={"frame_rate": int(background.frame_rate * ratio)},
            ).set_frame_rate(background.frame_rate)
        else:
            # If voice-over is shorter, speed up the background music
            stretched = speedup(background, playback_speed=1 / ratio)

        # Lower the volume of background music to not overpower voice-over
        background_volume = (
            -5
        )  # Adjust this value to control background music volume (in dB)
        stretched = stretched + background_volume

        # Mix audio and save
        output_path = audio_filepath.replace("voiceover_", "final_")
        if os.path.exists(audio_filepath):
            voice_over.overlay(stretched, position=0).export(output_path, format="mp3")
            return output_path
        else:
            st.error(f"Audio file not found during mixing: {audio_filepath}")
            return None
    except Exception as e:
        st.error(
            f"Error applying background music to '{os.path.basename(audio_filepath)}': {str(e)}"
        )
        return None


def cleanup_old_audio_files(directory="generated_audio", max_age_hours=24):
    """
    Deletes MP3 files older than a specified number of hours from a directory.

    Args:
        directory (str): The directory to clean up. Defaults to "generated_audio".
        max_age_hours (int): The maximum age of files in hours. Defaults to 24.

    Returns:
        int: The number of files deleted.
    """
    if not os.path.isdir(directory):
        # st.warning(f"Cleanup directory '{directory}' not found.") # Optional warning
        return 0  # Indicate no files were deleted

    now = time.time()
    cutoff = now - timedelta(hours=max_age_hours).total_seconds()
    deleted_count = 0
    files_to_check = []
    try:
        files_to_check = os.listdir(directory)
    except OSError as e:
        st.error(f"Error accessing directory {directory} for cleanup: {e}")
        return 0  # Cannot proceed

    for filename in files_to_check:
        if not filename.endswith(".mp3"):  # Only target mp3 files
            continue
        filepath = os.path.join(directory, filename)
        try:
            if os.path.isfile(filepath):
                file_mod_time = os.path.getmtime(filepath)
                if file_mod_time < cutoff:
                    os.remove(filepath)
                    deleted_count += 1
                    # Optionally log deletion: print(f"Deleted old audio file: {filepath}")
        except FileNotFoundError:
            # File might have been deleted by another process between listdir and check, ignore.
            pass
        except OSError as e:
            st.warning(f"Error deleting file {filepath}: {e}")  # Warn but continue
        except Exception as e:
            # Catch unexpected errors during file processing
            st.warning(f"Unexpected error processing file {filepath} for cleanup: {e}")

    return deleted_count


# Add other utility functions as needed
