# Stupid Movie Trailer Generator

Create hilarious movie trailers with randomly generated elements! This application uses AI to generate scripts and voiceovers for trailers based on your chosen themes.

## Installation

Before you begin, you'll need to have Python installed on your computer. You can download it from [https://www.python.org/downloads/](https://www.python.org/downloads/).

1. **Install Dependencies:**

    This project requires a few Python libraries. You can install them using the following command in your terminal (Mac) or Command Prompt (Windows):

    ```bash
    pip install -r requirements.txt
    ```

    Alternatively, you can install the required libraries individually:

    ```bash
    pip install streamlit requests
    ```

2. **Install Ollama and the required model:**

    This project uses Ollama to generate the movie trailer script. Here's how to install it:

    * Go to the [Ollama website](https://ollama.com/) and follow the installation instructions for your operating system.
    * Once Ollama is installed, open your terminal (Mac) or Command Prompt (Windows) and run the following command to download the required model:

        ```bash
        ollama pull llama3.2:3b
        ```

        This command downloads the `llama3.2:3b` model, which is used to generate the movie trailer script.

## ElevenLabs API Key

To generate voiceovers, you'll need an API key from ElevenLabs. Here's how to get one:

1. Go to the [ElevenLabs website](https://elevenlabs.io/) and create an account.
2. Once you're logged in, go to your profile settings.
3. You'll find your API key on the profile page.

## API Key Management

To securely store your ElevenLabs API key, follow these steps:

1. Create a `.streamlit` directory in the root of your project, if one doesn't exist yet.
2. Inside the `.streamlit` directory, create a file named `secrets.toml`.
3. Add your API key to the `secrets.toml` file like this:

```toml
ELEVENLABS_API_KEY = "YOUR_API_KEY"
```

Replace `"YOUR_API_KEY"` with your actual ElevenLabs API key.

## Usage

1. **Run the Streamlit app:**

    Open your terminal (Mac) or Command Prompt (Windows) and navigate to the project directory. Then, run the following command:

    ```bash
    streamlit run app.py
    ```

    This will start the Streamlit app in your web browser.
