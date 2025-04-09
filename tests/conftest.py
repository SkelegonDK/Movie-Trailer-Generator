import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from tests.utils import new_dict

# Get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Add the project root to the Python path
sys.path.insert(0, project_root)


@pytest.fixture(autouse=True)
def mock_streamlit():
    """
    Automatically mock Streamlit for all tests.
    This prevents Streamlit-specific code from failing in test environment.
    """
    with patch("streamlit.secrets", new_dict()) as mock_secrets:
        with patch("streamlit.session_state", new_dict()) as mock_state:
            yield {"secrets": mock_secrets, "session_state": mock_state}


@pytest.fixture
def test_env():
    """
    Set up test environment variables.
    """
    os.environ["ELEVENLABS_API_KEY"] = "test_key"
    os.environ["OPENROUTER_API_KEY"] = "test_key"
    yield
    del os.environ["ELEVENLABS_API_KEY"]
    del os.environ["OPENROUTER_API_KEY"]


def pytest_configure(config):
    """
    Custom pytest configuration.
    """
    # Add custom markers
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "api: mark test as requiring API access")
