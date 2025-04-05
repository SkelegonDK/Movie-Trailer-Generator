import streamlit as st

st.set_page_config(page_title="Ollama Guide", layout="wide")

st.title("Ollama Setup Guide 🦙")

st.markdown(
    """
Welcome to the Ollama setup guide! Using Ollama allows you to run powerful language models
locally on your own machine for free.

Follow these steps to get started:
"""
)

st.header("1. Install Ollama")
st.markdown(
    """
First, you need to download and install Ollama on your system.
Visit the official Ollama website and follow the instructions for your operating system:

[**➡️ Ollama Download & Installation Instructions**](https://ollama.com/)
"""
)
st.info("Make sure Ollama is running after installation.")


st.header("2. Download a Model")
st.markdown(
    """
Once Ollama is installed and running, you need to download a language model.
This application is tested with `llama3.2:3b`, which is a good balance of performance
and capability for many systems.

Open your terminal or command prompt and run:
```bash
ollama pull llama3.2:3b
```
This command will download the model files to your computer. You can download other models
from the [Ollama Library](https://ollama.com/library) as well. The application will automatically
detect any models you have installed.
"""
)

st.header("3. Use Ollama in the App")
st.markdown(
    """
That's it for the setup! Now you can use your local models in the generator:

1.  Go back to the main **Movie Trailer Generator** page using the sidebar navigation.
2.  In the **Model Settings** section of the sidebar, toggle on **"Ollama mode"**.
3.  Select your desired installed model from the dropdown list that appears.

The application will now use your selected local Ollama model to generate the movie title and script.
"""
)

st.success("You're all set to generate trailers using your local Ollama models!")
