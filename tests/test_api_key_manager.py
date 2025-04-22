import pytest
import streamlit as st
from datetime import datetime, timedelta
from utils.api_key_manager import APIKeyManager
from tests.utils import MockDict
from unittest.mock import patch


@pytest.fixture
def mock_session_state():
    """Mock Streamlit session state"""
    with patch("streamlit.session_state", MockDict()) as mock_state:
        yield mock_state


def test_api_key_set_and_get(mock_session_state):
    """Test setting and getting API keys"""
    key_name = "TEST_API_KEY"
    key_value = "test-key-123"

    # Set API key
    APIKeyManager.set_api_key(key_name, key_value)

    # Verify key was stored
    assert hasattr(st.session_state, "api_keys")
    assert key_name in st.session_state.api_keys
    assert st.session_state.api_keys[key_name]["value"] == key_value

    # Get API key
    retrieved_key = APIKeyManager.get_api_key(key_name)
    assert retrieved_key == key_value


def test_api_key_expiration(mock_session_state):
    """Test API key expiration"""
    key_name = "TEST_API_KEY"
    key_value = "test-key-123"

    # Set API key with 1 hour expiration
    APIKeyManager.set_api_key(key_name, key_value, expiration_hours=1)

    # Verify key exists
    assert APIKeyManager.get_api_key(key_name) == key_value

    # Simulate time passing (2 hours)
    future_time = datetime.now() + timedelta(hours=2)
    with patch("datetime.datetime") as mock_datetime:
        mock_datetime.now.return_value = future_time

        # Key should be expired
        assert APIKeyManager.get_api_key(key_name) is None
        assert key_name not in st.session_state.api_keys


def test_api_key_clear(mock_session_state):
    """Test clearing API keys"""
    key_name = "TEST_API_KEY"
    key_value = "test-key-123"

    # Set API key
    APIKeyManager.set_api_key(key_name, key_value)
    assert APIKeyManager.get_api_key(key_name) == key_value

    # Clear key
    APIKeyManager.clear_api_key(key_name)
    assert APIKeyManager.get_api_key(key_name) is None
    assert key_name not in st.session_state.api_keys


def test_multiple_api_keys(mock_session_state):
    """Test managing multiple API keys"""
    keys = {"KEY1": "value1", "KEY2": "value2", "KEY3": "value3"}

    # Set multiple keys
    for name, value in keys.items():
        APIKeyManager.set_api_key(name, value)

    # Verify all keys
    for name, value in keys.items():
        assert APIKeyManager.get_api_key(name) == value

    # Clear one key
    APIKeyManager.clear_api_key("KEY2")
    assert APIKeyManager.get_api_key("KEY1") == "value1"
    assert APIKeyManager.get_api_key("KEY2") is None
    assert APIKeyManager.get_api_key("KEY3") == "value3"


def test_get_key_expiration(mock_session_state):
    """Test getting API key expiration time"""
    key_name = "TEST_API_KEY"
    key_value = "test-key-123"
    expiration_hours = 24

    # Set API key
    APIKeyManager.set_api_key(key_name, key_value, expiration_hours=expiration_hours)

    # Get expiration time
    expiration = APIKeyManager.get_key_expiration(key_name)
    assert expiration is not None
    assert isinstance(expiration, datetime)

    # Verify expiration is approximately correct (within 1 second)
    expected_expiration = datetime.now() + timedelta(hours=expiration_hours)
    assert abs((expiration - expected_expiration).total_seconds()) < 1


def test_nonexistent_key(mock_session_state):
    """Test behavior with nonexistent keys"""
    assert APIKeyManager.get_api_key("NONEXISTENT_KEY") is None
    assert APIKeyManager.get_key_expiration("NONEXISTENT_KEY") is None

    # Clearing nonexistent key should not raise error
    APIKeyManager.clear_api_key("NONEXISTENT_KEY")
