import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Add the project root to the Python path
sys.path.insert(0, project_root)


@pytest.fixture(autouse=True)
def mock_config():
    """Mock configuration for all tests"""
    with patch("scripts.openrouter_client.config") as mock:
        mock.is_valid.return_value = True
        mock.openrouter_api_key = "test-api-key"
        mock.openrouter_model = "test-model"
        yield mock


@pytest.fixture
def mock_successful_response():
    """Mock a successful API response"""
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "choices": [{"message": {"content": "Test response"}}]
    }
    return response


@pytest.fixture
def mock_models_response():
    """Mock a successful models API response"""
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "data": [
            {
                "id": "model1",
                "name": "Test Model 1",
                "context_length": 4096,
                "pricing": {"prompt": "0.0001", "completion": "0.0002"},
            },
            {
                "id": "model2",
                "name": "Test Model 2",
                "context_length": 8192,
                "pricing": {"prompt": "0.0002", "completion": "0.0003"},
            },
        ]
    }
    return response


def pytest_configure(config):
    """Add custom markers"""
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "timeout: mark test with timeout")
