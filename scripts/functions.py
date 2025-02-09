import os
import json
import requests
import streamlit as st
from datetime import datetime
import uuid


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
        with open(os.path.join(data_dir, filename), "r") as f:
            trailer_points.append(json.load(f))

    return trailer_points


def generate_with_llama3(prompt):
    """
    Generates content using the Llama3 model via a local Ollama instance.

    Args:
        prompt (str): The prompt to send to the Llama3 model.

    Returns:
        str: The generated content from the Llama3 model, or None if an error occurs.
    """
    url = "http://localhost:11434/api/generate"
    data = {"model": "llama3.2:3b", "prompt": prompt, "stream": False}
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json()["response"]
    else:
        return None


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


def generate_script_with_ollama(prompt):
    """
    Generates a movie trailer script using the Llama3 model via a local Ollama instance.

    Args:
        prompt (str): The prompt to send to the Llama3 model.

    Returns:
        str: The generated movie trailer script from the Llama3 model, or None if an error occurs.
    """
    url = "http://localhost:11434/api/generate"
    data = {"model": "llama3.2:3b", "prompt": prompt, "stream": False}
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
        "xi-api-key": st.secrets.get("ELEVENLABS_API_KEY"),
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


def save_audio_file(audio_content, selected_points, movie_name):
    """
    Saves the generated audio content to a file in the generated_audio directory.

    Args:
        audio_content (bytes): The audio content to save.
        selected_points (dict): A dictionary of selected trailer elements.
        movie_name (str): The name of the movie.

    Returns:
        str: The filepath of the saved audio file.
    """
    if not os.path.exists("generated_audio"):
        os.makedirs("generated_audio")

    unique_id = uuid.uuid4()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    elements = "_".join([point.replace(" ", "-") for point in selected_points.values()])
    filename = f"{movie_name}_{elements}_{unique_id}_{timestamp}.mp3"
    filename = "".join(
        char for char in filename if char.isalnum() or char in ["_", "-", "."]
    )[:255]
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


def generate_movie_name_with_id(genre, main_character, setting, conflict, plot_twist):
    """
    Generates a movie title using the Llama3 model, incorporating the trailer elements.

    Args:
        genre (str): The genre of the movie.
        main_character (str): The main character of the movie.
        setting (str): The setting of the movie.
        conflict (str): The conflict of the movie.
        plot_twist (str): The plot twist of the movie.

    Returns:
        str: The generated movie title in JSON format, or None if an error occurs.
    """
    prompt = f"""Based on the following movie elements:
    Genre: {genre}
    Main Character: {main_character}
    Setting: {setting}
    Conflict: {conflict}
    Plot Twist: {plot_twist}
    generate a catchy and appropriate movie title in JSON format:

Example output:
{{
    "movie_name": "The Last Samurai"
}}

Guidelines:
- The title should be short and memorable (1-5 words)
- It should reflect the genre, tone, and main elements of the movie
- Be creative and avoid generic titles
- Do not use quotes or explanations, just provide the JSON output

Output:"""

    response = generate_with_llama3(prompt)
    print("LLM Response:", response)  # Debugging line
    if response:
        return json.loads(response)  # Parse the JSON response
    return None


# Add other utility functions as needed
