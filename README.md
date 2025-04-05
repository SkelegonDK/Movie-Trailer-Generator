# Movie Trailer Generator

Create hilarious movie trailers with randomly generated elements! This application uses AI to generate scripts and voiceovers for trailers based on your chosen themes.

## Installation

Before you begin, you'll need to have Python installed on your computer. You can download it from [https://www.python.org/downloads/](https://www.python.org/downloads/).

1. **Install `uv`:**

    This project uses `uv` for managing dependencies and virtual environments. Install it first (you might need `pip`):

    ```bash
    pip install uv
    ```
    *(Refer to the [official uv documentation](https://github.com/astral-sh/uv) for other installation methods if needed).*

2. **Install Project Dependencies:**

    Navigate to the project directory in your terminal and run:

    ```bash
    uv sync
    ```
    This command will create a virtual environment (if one isn't active) and install all necessary Python libraries defined in `pyproject.toml`.

3. **Audio Processing Requirements:**

    This project uses pydub for audio processing. You'll need to have the following:

    * Background music file: Place your trailer music in `assets/audio/trailer_music.mp3`
    * The background music will be automatically stretched to match the voice-over length and mixed at a lower volume

## API Keys

This application requires API keys for external services:

### 1. ElevenLabs API Key

To generate voiceovers, you'll need an API key from ElevenLabs.

1. Go to the [ElevenLabs website](https://elevenlabs.io/) and create an account.
2. Once you're logged in, go to your profile settings.
3. You'll find your API key on the profile page.

### 2. OpenRouter API Key

To generate the movie title and script, you'll need an API key from OpenRouter.
They offer free credits and access to various models.

1. Go to the [OpenRouter website](https://openrouter.ai/keys) and sign up/log in.
2. Create a new API key.

## API Key Management

To securely store your API keys, follow these steps:

1. Create a `.streamlit` directory in the root of your project, if one doesn't exist yet.
2. Inside the `.streamlit` directory, create a file named `secrets.toml`.
3. Add your API keys to the `secrets.toml` file like this:

```toml
ELEVENLABS_API_KEY = "YOUR_ELEVENLABS_KEY"
OPENROUTER_API_KEY = "YOUR_OPENROUTER_KEY"

# Optional: Override default OpenRouter models
# openrouter_default_model = "mistralai/mistral-small-3.1-24b-instruct:free"
# openrouter_model_list = [
#   "mistralai/mistral-small-3.1-24b-instruct:free",
#   "google/gemma-3-4b-it:free"
# ]
```

Replace `"YOUR_ELEVENLABS_KEY"` and `"YOUR_OPENROUTER_KEY"` with your actual API keys. You can also optionally override the default OpenRouter model and the list of available models here, as shown in the commented-out example.

## Usage

1. **Run the Streamlit app:**

    Open your terminal (Mac) or Command Prompt (Windows) and navigate to the project directory. Then, run the following command:

    ```bash
    streamlit run app.py
    ```

    This will start the Streamlit app in your web browser.
