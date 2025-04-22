import streamlit as st
from typing import Optional
from datetime import datetime, timedelta


class APIKeyManager:
    """Manages API keys in session storage with expiration."""

    @staticmethod
    def set_api_key(key_name: str, key_value: str, expiration_hours: int = 48) -> None:
        """
        Store an API key in session state with expiration.

        Args:
            key_name: Name of the API key (e.g., 'ELEVENLABS_API_KEY')
            key_value: The API key value
            expiration_hours: Number of hours until the key expires (default: 48)
        """
        if not hasattr(st.session_state, "api_keys"):
            st.session_state.api_keys = {}

        st.session_state.api_keys[key_name] = {
            "value": key_value,
            "expires_at": datetime.now() + timedelta(hours=expiration_hours),
        }

    @staticmethod
    def get_api_key(key_name: str) -> Optional[str]:
        """
        Retrieve an API key from session state, checking expiration.

        Args:
            key_name: Name of the API key to retrieve

        Returns:
            The API key if valid and not expired, None otherwise
        """
        if not hasattr(st.session_state, "api_keys"):
            return None

        key_data = st.session_state.api_keys.get(key_name)
        if not key_data:
            return None

        if datetime.now() > key_data["expires_at"]:
            # Key has expired, remove it
            del st.session_state.api_keys[key_name]
            return None

        return key_data["value"]

    @staticmethod
    def clear_api_key(key_name: str) -> None:
        """
        Remove an API key from session state.

        Args:
            key_name: Name of the API key to remove
        """
        if (
            hasattr(st.session_state, "api_keys")
            and key_name in st.session_state.api_keys
        ):
            del st.session_state.api_keys[key_name]

    @staticmethod
    def get_key_expiration(key_name: str) -> Optional[datetime]:
        """
        Get the expiration time for an API key.

        Args:
            key_name: Name of the API key

        Returns:
            Expiration datetime if key exists, None otherwise
        """
        if not hasattr(st.session_state, "api_keys"):
            return None

        key_data = st.session_state.api_keys.get(key_name)
        return key_data["expires_at"] if key_data else None
