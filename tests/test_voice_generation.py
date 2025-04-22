import os
import pytest
import streamlit as st
from unittest.mock import MagicMock, patch
from scripts.functions import generate_audio_with_elevenlabs, save_audio_file
import hashlib
import json
from tests.utils import MockDict
import requests
import time
from utils.api_key_manager import APIKeyManager


class MockResponse:
    def __init__(self, status_code=200, content=b"test_audio"):
        self.status_code = status_code
        self.content = content
        self.ok = status_code == 200

    def raise_for_status(self):
        if not self.ok:
            raise requests.exceptions.HTTPError(f"HTTP Error: {self.status_code}")


@pytest.fixture
def mock_session_state():
    with patch("streamlit.session_state", new=MockDict()) as mock_state:
        yield mock_state


@pytest.fixture
def mock_requests(monkeypatch):
    mock = MagicMock()
    mock.post.return_value = MockResponse()
    monkeypatch.setattr("requests.post", mock.post)
    return mock


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


def test_voice_generation_request_tracking(mock_session_state, mock_requests):
    """
    Test that voice generation is only triggered when explicitly requested.
    """
    # Test when voice generation is not requested
    assert generate_audio_with_elevenlabs("test") is None
    assert not mock_requests.post.called

    # Test when voice generation is requested
    mock_session_state["voice_generation_requested"] = True
    APIKeyManager.set_api_key("ELEVENLABS_API_KEY", "test_key")

    result = generate_audio_with_elevenlabs("test")
    assert result == b"test_audio"
    assert mock_requests.post.called


def test_duplicate_call_prevention(mock_requests):
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
            assert mock_requests.post.call_count == 1

            # Change script content
            mock_state.generated_script = "Different test script"

            # Generate voice with new script
            audio3 = generate_audio_with_elevenlabs(mock_state.generated_script)

            # Verify second API call was made
            assert mock_requests.post.call_count == 2


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


def test_rate_limiting(mock_session_state, mock_requests):
    mock_session_state["voice_generation_requested"] = True
    APIKeyManager.set_api_key("ELEVENLABS_API_KEY", "test_key")

    # Make multiple requests rapidly
    start_time = time.time()
    for _ in range(3):
        generate_audio_with_elevenlabs("test")

    # Check that minimum interval was enforced
    elapsed = time.time() - start_time
    assert elapsed >= 1.0  # At least 0.5s between each request

    # Reset cache for rate limit test
    mock_session_state["elevenlabs_cache"]["request_count"] = 0
    mock_session_state["elevenlabs_cache"]["rate_limit_reset"] = time.time()

    # Test rate limit per minute
    for _ in range(11):  # Try to exceed the 10 requests per minute limit
        generate_audio_with_elevenlabs("test")

    # Verify the last request was blocked
    assert mock_requests.post.call_count == 10


def test_enhanced_caching(mock_session_state, mock_requests):
    mock_session_state["voice_generation_requested"] = True
    APIKeyManager.set_api_key("ELEVENLABS_API_KEY", "test_key")

    # First request should make an API call
    result1 = generate_audio_with_elevenlabs("test", "voice1")
    assert result1 == b"test_audio"
    assert mock_requests.post.call_count == 1

    # Same text and voice should use cache
    result2 = generate_audio_with_elevenlabs("test", "voice1")
    assert result2 == b"test_audio"
    assert mock_requests.post.call_count == 1

    # Different text should make new API call
    result3 = generate_audio_with_elevenlabs("different", "voice1")
    assert result3 == b"test_audio"
    assert mock_requests.post.call_count == 2

    # Different voice should make new API call
    result4 = generate_audio_with_elevenlabs("test", "voice2")
    assert result4 == b"test_audio"
    assert mock_requests.post.call_count == 3


def test_error_handling(mock_session_state, mock_requests):
    mock_session_state["voice_generation_requested"] = True
    APIKeyManager.set_api_key("ELEVENLABS_API_KEY", "test_key")

    # Test request exception
    mock_requests.post.side_effect = Exception("Network error")
    result = generate_audio_with_elevenlabs("test")
    assert result is None

    # Test HTTP error
    mock_requests.post.side_effect = None
    mock_requests.post.return_value = MockResponse(status_code=403)
    result = generate_audio_with_elevenlabs("test")
    assert result is None


def test_cache_persistence(mock_session_state, mock_requests):
    mock_session_state["voice_generation_requested"] = True
    APIKeyManager.set_api_key("ELEVENLABS_API_KEY", "test_key")

    # Generate audio and verify it's cached
    text = "test cache persistence"
    generate_audio_with_elevenlabs(text)

    # Verify cache structure
    assert "elevenlabs_cache" in mock_session_state
    assert "audio" in mock_session_state["elevenlabs_cache"]
    assert "last_request_time" in mock_session_state["elevenlabs_cache"]
    assert "request_count" in mock_session_state["elevenlabs_cache"]
    assert "rate_limit_reset" in mock_session_state["elevenlabs_cache"]

    # Verify cached content
    cache_key = next(iter(mock_session_state["elevenlabs_cache"]["audio"]))
    assert mock_session_state["elevenlabs_cache"]["audio"][cache_key] == b"test_audio"
