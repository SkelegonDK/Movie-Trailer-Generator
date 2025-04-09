import os
import pytest
import streamlit as st
from unittest.mock import MagicMock, patch
from scripts.functions import generate_audio_with_elevenlabs, save_audio_file
import hashlib
import json
from tests.utils import MockDict
import requests


class MockResponse:
    def __init__(self, content=b"mock_audio_content", status_code=200):
        self.content = content
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code != 200:
            raise requests.exceptions.HTTPError(f"HTTP Status: {self.status_code}")


@pytest.fixture
def mock_elevenlabs_api():
    """
    Mock ElevenLabs API responses for testing.

    Returns:
        MagicMock: A mock object simulating requests to ElevenLabs API
    """
    with patch("requests.post") as mock_post:
        mock_post.return_value = MockResponse()
        yield mock_post


@pytest.fixture
def mock_audio_file_handling(tmp_path):
    """
    Set up temporary directory for audio file handling during tests.

    Args:
        tmp_path: pytest fixture providing temporary directory

    Returns:
        str: Path to temporary audio directory
    """
    audio_dir = tmp_path / "generated_audio"
    audio_dir.mkdir()
    with patch("scripts.functions.save_audio_file") as mock_save:
        mock_save.return_value = str(audio_dir / "test_audio.mp3")
        yield str(audio_dir)


def test_voice_generation_request_tracking(mock_elevenlabs_api):
    """
    Test that voice generation is only triggered when explicitly requested.
    """
    with patch("streamlit.session_state", MockDict()) as mock_state:
        with patch(
            "streamlit.secrets", MockDict(ELEVENLABS_API_KEY="test_key")
        ) as mock_secrets:
            # Initialize session state
            mock_state.script_generated = True
            mock_state.generated_script = "Test script content"
            mock_state.voice_generation_requested = False

            # Attempt voice generation without request
            audio = generate_audio_with_elevenlabs(mock_state.generated_script)

            # Verify no API call was made
            mock_elevenlabs_api.assert_not_called()

            # Set voice generation request flag
            mock_state.voice_generation_requested = True

            # Attempt voice generation with request
            audio = generate_audio_with_elevenlabs(mock_state.generated_script)

            # Verify API call was made
            mock_elevenlabs_api.assert_called_once()


def test_duplicate_call_prevention(mock_elevenlabs_api):
    """
    Test that duplicate API calls are prevented for the same script content.
    """
    with patch("streamlit.session_state", MockDict()) as mock_state:
        with patch(
            "streamlit.secrets", MockDict(ELEVENLABS_API_KEY="test_key")
        ) as mock_secrets:
            # Initialize session state
            mock_state.script_generated = True
            mock_state.generated_script = "Test script content"
            mock_state.voice_generation_requested = True

            # Generate voice first time
            audio1 = generate_audio_with_elevenlabs(mock_state.generated_script)

            # Attempt second generation with same script
            audio2 = generate_audio_with_elevenlabs(mock_state.generated_script)

            # Verify only one API call was made
            mock_elevenlabs_api.assert_called_once()

            # Change script content
            mock_state.generated_script = "Different test script"

            # Generate voice with new script
            audio3 = generate_audio_with_elevenlabs(mock_state.generated_script)

            # Verify second API call was made
            assert mock_elevenlabs_api.call_count == 2


def test_api_key_validation():
    """
    Test that voice generation respects API key presence/absence.
    """
    with patch(
        "streamlit.session_state", MockDict(voice_generation_requested=True)
    ) as mock_state:
        # Test with missing API key
        with patch("streamlit.secrets", MockDict()) as mock_secrets:
            audio = generate_audio_with_elevenlabs("Test script")
            assert audio is None

        # Test with invalid API key
        with patch(
            "streamlit.secrets", MockDict(ELEVENLABS_API_KEY="invalid_key")
        ) as mock_secrets:
            with patch("requests.post") as mock_post:
                mock_post.return_value = MockResponse(status_code=401)
                audio = generate_audio_with_elevenlabs("Test script")
                assert audio is None

        # Test with valid API key
        with patch(
            "streamlit.secrets", MockDict(ELEVENLABS_API_KEY="valid_key")
        ) as mock_secrets:
            with patch("requests.post") as mock_post:
                mock_post.return_value = MockResponse()
                audio = generate_audio_with_elevenlabs("Test script")
                assert audio is not None
