import streamlit as st
from typing import Optional
from dataclasses import dataclass
import os


@dataclass
class Config:
    """Configuration class for the application."""

    openrouter_api_key: Optional[str] = None
    openrouter_model: str = "anthropic/claude-3-opus-20240229"
    background_music_path: str = "assets/audio/trailer_music.mp3"

    @classmethod
    def load(cls) -> "Config":
        """Load configuration from environment variables and Streamlit secrets."""
        config_data = {}

        # Try to load API key from environment variable first
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            config_data["openrouter_api_key"] = openrouter_key
        # Fall back to Streamlit secrets if env var not found
        elif hasattr(st.secrets, "openrouter_api_key"):
            config_data["openrouter_api_key"] = st.secrets.openrouter_api_key

        # Load model from Streamlit secrets if available
        if hasattr(st.secrets, "openrouter_model"):
            config_data["openrouter_model"] = st.secrets.openrouter_model

        return cls(**config_data)

    def is_valid(self) -> bool:
        """Check if the configuration is valid."""
        return bool(self.openrouter_api_key)


# Global configuration instance
config = Config.load()
