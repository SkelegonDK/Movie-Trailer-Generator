import streamlit as st
from utils.api_key_manager import APIKeyManager

st.title("API Key Management")

# Create two columns for API key inputs
col1, col2 = st.columns(2)

with col1:
    st.subheader("ElevenLabs API Key")
    st.markdown("[Get ElevenLabs API Key](https://elevenlabs.io/)")
    elevenlabs_api_key = st.text_input(
        "Enter your ElevenLabs API key",
        type="password",
        value=APIKeyManager.get_api_key("ELEVENLABS_API_KEY") or "",
        key="elevenlabs_key",
    )

with col2:
    st.subheader("OpenRouter API Key")
    st.markdown("[Get OpenRouter API Key](https://openrouter.ai/keys)")
    openrouter_api_key = st.text_input(
        "Enter your OpenRouter API key",
        type="password",
        value=APIKeyManager.get_api_key("OPENROUTER_API_KEY") or "",
        key="openrouter_key",
    )

# Save button for both API keys
if st.button("Save API Keys", use_container_width=True):
    if elevenlabs_api_key:
        APIKeyManager.set_api_key("ELEVENLABS_API_KEY", elevenlabs_api_key)
    if openrouter_api_key:
        APIKeyManager.set_api_key("OPENROUTER_API_KEY", openrouter_api_key)
    st.success("API keys saved! They will be valid for 48 hours.")
    st.rerun()

# Display current status
st.markdown("---")
st.subheader("API Keys Status")

status_col1, status_col2 = st.columns(2)

with status_col1:
    elevenlabs_key = APIKeyManager.get_api_key("ELEVENLABS_API_KEY")
    expiration = APIKeyManager.get_key_expiration("ELEVENLABS_API_KEY")
    if elevenlabs_key:
        st.success(
            f"ElevenLabs API Key: ✅ Set (Expires: {expiration.strftime('%Y-%m-%d %H:%M:%S')})"
        )
    else:
        st.error("ElevenLabs API Key: ❌ Not Set")

with status_col2:
    openrouter_key = APIKeyManager.get_api_key("OPENROUTER_API_KEY")
    expiration = APIKeyManager.get_key_expiration("OPENROUTER_API_KEY")
    if openrouter_key:
        st.success(
            f"OpenRouter API Key: ✅ Set (Expires: {expiration.strftime('%Y-%m-%d %H:%M:%S')})"
        )
    else:
        st.error("OpenRouter API Key: ❌ Not Set")

# Add information about session storage
st.markdown("---")
st.markdown(
    """
### About API Key Storage
Your API keys are stored securely in your browser's session storage and will expire after **48 hours**. 
They are never stored on the server or in any permanent storage. You'll need to re-enter them when:
- The session expires (48 hours)
- You close your browser
- You clear your browser data

---
### API Usage & Rate Limits

**OpenRouter**
- Requests are rate-limited to 1 request per second per user.
- If you exceed this, you may see errors or be temporarily blocked.
- Persistent failures will trigger a circuit breaker, temporarily disabling requests for your session.

**ElevenLabs**
- Subject to ElevenLabs' own API rate limits (see [official docs](https://docs.elevenlabs.io/)).
- If you hit a limit, you will see an error and can retry after a short wait.

If you encounter errors, you will see a detailed error message and a Retry button.
"""
)
