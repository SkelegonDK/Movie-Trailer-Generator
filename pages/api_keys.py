import streamlit as st
import os

st.title("API Key Management")


# Function to create secrets.toml if it doesn't exist
def create_secrets_file():
    secrets_path = os.path.join(".streamlit", "secrets.toml")
    if not os.path.exists(".streamlit"):
        os.makedirs(".streamlit")
    if not os.path.exists(secrets_path):
        with open(secrets_path, "w") as f:
            f.write(
                "# This is where you store your API keys. DO NOT share this file!\n"
            )
        st.success(
            "Created a secrets.toml file. Please add your API keys and restart the app."
        )
        return True
    return False


# Create secrets file if it doesn't exist
if create_secrets_file():
    st.stop()

st.subheader("ElevenLabs API Key")
elevenlabs_api_key = st.text_input(
    "Enter your ElevenLabs API key",
    type="password",
    value=st.secrets.get("ELEVENLABS_API_KEY", ""),
)

if elevenlabs_api_key:
    st.session_state.elevenlabs_api_key = elevenlabs_api_key
    # Save the API key to secrets.toml
    secrets_path = os.path.join(".streamlit", "secrets.toml")
    with open(secrets_path, "w") as f:
        f.write(f'ELEVENLABS_API_KEY = "{elevenlabs_api_key}"\n')
    st.success(
        "ElevenLabs API key saved! Please restart the app for the changes to take effect."
    )
