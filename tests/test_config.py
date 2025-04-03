import pytest
from config import Config
import streamlit as st


def test_config_default_values():
    """Test default configuration values."""
    config = Config()
    assert config.openrouter_api_key is None
    assert config.openrouter_model == "anthropic/claude-3-opus-20240229"
    assert config.background_music_path == "assets/audio/trailer_music.mp3"


def test_config_load_from_secrets(monkeypatch):
    """Test loading configuration from Streamlit secrets."""

    # Mock streamlit secrets
    class MockSecrets:
        openrouter_api_key = "test-api-key"
        openrouter_model = "test-model"

    monkeypatch.setattr(st, "secrets", MockSecrets())

    config = Config.load()
    assert config.openrouter_api_key == "test-api-key"
    assert config.openrouter_model == "test-model"
    assert config.background_music_path == "assets/audio/trailer_music.mp3"


def test_config_validation():
    """Test configuration validation."""
    config = Config()
    assert not config.is_valid()  # Should be invalid without API key

    config.openrouter_api_key = "test-key"
    assert config.is_valid()  # Should be valid with API key
