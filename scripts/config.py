import streamlit as st
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
import os


@dataclass
class Config:
    """Configuration class for the application."""

    openrouter_api_key: Optional[str] = None
    # Deprecated: Use openrouter_default_model instead
    openrouter_model: Optional[str] = None
    background_music_path: str = "assets/audio/trailer_music.mp3"

    # Added OpenRouter model list and default
    openrouter_model_list: List[str] = field(
        default_factory=lambda: [
            "deepseek/deepseek-chat-v3-0324:free",
            "mistralai/mistral-small-3.1-24b-instruct:free",
            "google/gemma-3-4b-it:free",
        ]
    )
    openrouter_default_model: Optional[str] = "deepseek/deepseek-chat-v3-0324:free"

    @classmethod
    def load(cls) -> "Config":
        """
        Load configuration settings, prioritizing environment variables over Streamlit secrets.

        Loads the following settings if available:
        - openrouter_api_key: From OPENROUTER_API_KEY env var or st.secrets.openrouter_api_key.
        - openrouter_model_list: From st.secrets.openrouter_model_list. Defaults factory if not found.
        - openrouter_default_model: From st.secrets.openrouter_default_model, falling back
          to the deprecated st.secrets.openrouter_model if necessary. Uses class default otherwise.

        Returns:
            Config: An instance of the Config class populated with loaded settings.
        """
        config_data: Dict[str, Any] = {}

        # --- API Key ---
        # Try env var first
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            config_data["openrouter_api_key"] = openrouter_key
        # Fall back to secrets
        elif hasattr(st.secrets, "openrouter_api_key"):
            config_data["openrouter_api_key"] = st.secrets.openrouter_api_key

        # --- Model List ---
        # Load from secrets if available
        if hasattr(st.secrets, "openrouter_model_list") and isinstance(
            st.secrets.openrouter_model_list, list
        ):
            config_data["openrouter_model_list"] = st.secrets.openrouter_model_list

        # --- Default Model ---
        # Load from secrets if available
        if hasattr(st.secrets, "openrouter_default_model"):
            config_data["openrouter_default_model"] = (
                st.secrets.openrouter_default_model
            )
        # Deprecated fallback (for backward compatibility)
        elif hasattr(st.secrets, "openrouter_model"):
            config_data["openrouter_default_model"] = st.secrets.openrouter_model

        return cls(**config_data)

    def is_valid(self) -> bool:
        """Check if the configuration is valid (primarily API key)."""
        return bool(self.openrouter_api_key)


# Global configuration instance (Consider removing/refactoring)
# config = Config.load() # Removing the global instance creation here
