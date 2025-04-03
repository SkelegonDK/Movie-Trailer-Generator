import streamlit as st
import os
import time

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
        st.success("Created a secrets.toml file. Please add your API keys.")
        return True
    return False


# Function to save API keys to secrets.toml
def save_api_keys(elevenlabs_key=None, openrouter_key=None):
    secrets_path = os.path.join(".streamlit", "secrets.toml")
    current_secrets = {}

    # Read existing secrets
    if os.path.exists(secrets_path):
        with open(secrets_path, "r") as f:
            content = f.read()
            # Parse existing keys
            for line in content.split("\n"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    current_secrets[key.strip()] = value.strip().strip('"')

    # Update with new values if provided
    if elevenlabs_key is not None:
        current_secrets["ELEVENLABS_API_KEY"] = elevenlabs_key
    if openrouter_key is not None:
        current_secrets["OPENROUTER_API_KEY"] = openrouter_key

    # Write back all secrets
    with open(secrets_path, "w") as f:
        f.write("# This is where you store your API keys. DO NOT share this file!\n")
        for key, value in current_secrets.items():
            f.write(f'{key} = "{value}"\n')

    return True


# Create secrets file if it doesn't exist
if create_secrets_file():
    st.stop()

# Create two columns for API key inputs
col1, col2 = st.columns(2)

with col1:
    st.subheader("ElevenLabs API Key")
    st.markdown("[Get ElevenLabs API Key](https://elevenlabs.io/)")
    elevenlabs_api_key = st.text_input(
        "Enter your ElevenLabs API key",
        type="password",
        value=st.secrets.get("ELEVENLABS_API_KEY", ""),
        key="elevenlabs_key",
    )

with col2:
    st.subheader("OpenRouter API Key")
    st.markdown("[Get OpenRouter API Key](https://openrouter.ai/keys)")
    openrouter_api_key = st.text_input(
        "Enter your OpenRouter API key",
        type="password",
        value=st.secrets.get("OPENROUTER_API_KEY", ""),
        key="openrouter_key",
    )

# Save button for both API keys
if st.button("Save API Keys", use_container_width=True):
    if save_api_keys(elevenlabs_api_key, openrouter_api_key):
        st.success("API keys saved! Restarting app...")
        time.sleep(1)  # Give user time to see the success message
        st.rerun()

# Display current status
st.markdown("---")
st.subheader("API Keys Status")

status_col1, status_col2 = st.columns(2)

with status_col1:
    if st.secrets.get("ELEVENLABS_API_KEY"):
        st.success("ElevenLabs API Key: ✅ Set")
    else:
        st.error("ElevenLabs API Key: ❌ Not Set")

with status_col2:
    if st.secrets.get("OPENROUTER_API_KEY"):
        st.success("OpenRouter API Key: ✅ Set")
    else:
        st.error("OpenRouter API Key: ❌ Not Set")
