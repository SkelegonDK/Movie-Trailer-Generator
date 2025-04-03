import pytest
from unittest.mock import patch, MagicMock, Mock
from scripts.openrouter_client import OpenRouterClient
from config import Config
import requests
from scripts import prompts
from requests.exceptions import RequestException
import json
import socket


@pytest.fixture
def mock_config():
    """Mock configuration for testing."""
    with patch("scripts.openrouter_client.config") as mock:
        mock.is_valid.return_value = True
        mock.openrouter_api_key = "test-api-key"
        mock.openrouter_model = "test-model"
        mock.openrouter_base_url = "https://openrouter.ai/api/v1"
        yield mock


@pytest.fixture
def mock_dns():
    """Mock DNS resolution."""
    with patch("socket.gethostbyname") as mock:
        mock.return_value = "1.2.3.4"
        yield mock


@pytest.fixture
def mock_movie_elements():
    """Mock movie elements for testing."""
    return {
        "genre": "Sci-Fi",
        "movie_name": "The Moldy Awakening",
    }


@pytest.fixture
def mock_successful_response():
    """Mock successful API response."""
    return {"choices": [{"message": {"content": "Generated text"}}]}


@pytest.fixture
def mock_models_response():
    """Mock successful models API response."""
    return {"data": [{"id": "model1"}, {"id": "model2"}]}


def test_client_initialization_without_api_key():
    """Test client initialization fails without API key."""
    with patch("scripts.openrouter_client.config") as mock_config:
        mock_config.is_valid.return_value = False
        with pytest.raises(ValueError, match="OpenRouter API key not configured"):
            OpenRouterClient()


def test_client_initialization(mock_config):
    """Test successful client initialization."""
    client = OpenRouterClient()
    assert client.headers["Authorization"] == "Bearer test-api-key"
    assert client.headers["Content-Type"] == "application/json"
    assert client.headers["X-Title"] == "Stupid Movie Trailer Generator"


def test_generate_text(mock_config, mock_dns, mock_successful_response):
    """Test text generation with mocked response."""
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        client = OpenRouterClient()
        result = client.generate_text("Test prompt", system_prompt="Test system prompt")
        assert result == "Generated text"

        # Verify the request was made with correct data
        called_data = mock_post.call_args[1]["json"]
        assert called_data["messages"][0]["content"] == "Test system prompt"
        assert called_data["messages"][1]["content"] == "Test prompt"
        assert called_data["model"] == "test-model"


def test_get_available_models(mock_config, mock_dns, mock_models_response):
    """Test fetching available models."""
    with patch("requests.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = mock_models_response
        mock_get.return_value = mock_response

        client = OpenRouterClient()
        models = client.get_available_models()
        assert len(models) == 2
        assert models[0]["id"] == "model1"


def test_generate_text_with_custom_model(
    mock_config, mock_dns, mock_successful_response
):
    """Test text generation with custom model."""
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        client = OpenRouterClient()
        result = client.generate_text("Test prompt", model="custom-model")
        assert result == "Generated text"

        # Verify custom model was used
        called_data = mock_post.call_args[1]["json"]
        assert called_data["model"] == "custom-model"


def test_api_error_handling(mock_config, mock_dns):
    """Test API error handling."""
    with patch("requests.post") as mock_post:
        mock_post.side_effect = RequestException("API Error")
        client = OpenRouterClient()
        with pytest.raises(
            RequestException, match="OpenRouter API request failed: API Error"
        ):
            client.generate_text("Test prompt")


def test_generate_text_with_default_prompt(
    mock_config, mock_dns, mock_successful_response
):
    """Test text generation with default system prompt."""
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        client = OpenRouterClient()
        result = client.generate_text("Test prompt")
        assert result == "Generated text"

        # Verify request data
        called_data = mock_post.call_args[1]["json"]
        assert "messages" in called_data
        assert len(called_data["messages"]) == 2
        assert called_data["messages"][1]["content"] == "Test prompt"


def test_generate_text_with_custom_prompt(
    mock_config, mock_dns, mock_successful_response
):
    """Test text generation with custom system prompt."""
    custom_prompt = "Custom system prompt"

    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        client = OpenRouterClient()
        result = client.generate_text("Test prompt", system_prompt=custom_prompt)
        assert result == "Generated text"

        # Verify request data
        called_data = mock_post.call_args[1]["json"]
        assert called_data["messages"][0]["content"] == custom_prompt


def test_error_handling(mock_config, mock_dns):
    """Test error handling for various scenarios."""
    client = OpenRouterClient()

    # Test connection error
    with patch("requests.post") as mock_post:
        mock_post.side_effect = RequestException("Connection failed")
        with pytest.raises(
            RequestException, match="OpenRouter API request failed: Connection failed"
        ):
            client.generate_text("Test prompt")

    # Test timeout error
    with patch("requests.post") as mock_post:
        mock_post.side_effect = RequestException("Timeout")
        with pytest.raises(
            RequestException, match="OpenRouter API request failed: Timeout"
        ):
            client.generate_text("Test prompt")

    # Test invalid response
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = {"invalid": "response"}
        mock_post.return_value = mock_response
        with pytest.raises(RequestException):
            client.generate_text("Test prompt")


def test_model_override(mock_config, mock_dns, mock_successful_response):
    """Test model override functionality."""
    custom_model = "custom-model"

    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        client = OpenRouterClient()
        result = client.generate_text("Test prompt", model=custom_model)
        assert result == "Generated text"

        # Verify the model was overridden in the request
        called_data = mock_post.call_args[1]["json"]
        assert called_data["model"] == custom_model


def test_script_generation_prompt_formatting(
    mock_config, mock_dns, mock_successful_response
):
    """Test prompt formatting for script generation."""
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        client = OpenRouterClient()
        result = client.generate_text(
            "Generate a movie script", system_prompt="You are a screenwriter"
        )
        assert result == "Generated text"

        # Verify prompt formatting
        called_data = mock_post.call_args[1]["json"]
        assert called_data["messages"][0]["content"] == "You are a screenwriter"
        assert called_data["messages"][1]["content"] == "Generate a movie script"


@pytest.fixture
def client(mock_config, mock_dns):
    return OpenRouterClient()


def test_verify_dns_success(mock_dns):
    """Test successful DNS verification."""
    client = OpenRouterClient()
    assert client._verify_dns("api.openrouter.ai") is True
    mock_dns.assert_called_once_with("api.openrouter.ai")


def test_verify_dns_failure():
    """Test DNS verification failure."""
    with patch("socket.gethostbyname", side_effect=socket.gaierror()):
        client = OpenRouterClient()
        with pytest.raises(ConnectionError, match="DNS resolution failed"):
            client._verify_dns("api.openrouter.ai")


def test_init_with_invalid_config():
    with patch("scripts.openrouter_client.config") as mock:
        mock.is_valid.return_value = False
        with pytest.raises(ValueError, match="OpenRouter API key not configured"):
            OpenRouterClient()


def test_init_sets_headers(client):
    """Test successful client initialization."""
    assert client.headers["Authorization"] == "Bearer test-api-key"
    assert client.headers["Content-Type"] == "application/json"
    assert client.headers["X-Title"] == "Stupid Movie Trailer Generator"


def test_generate_text_success(client, mock_successful_response, mock_dns):
    """Test successful text generation."""
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        result = client.generate_text("Test prompt")
        assert result == "Generated text"


def test_generate_text_with_custom_params(client, mock_successful_response, mock_dns):
    """Test text generation with custom parameters."""
    with patch("requests.post") as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = mock_successful_response
        mock_post.return_value = mock_response

        result = client.generate_text(
            prompt="Test prompt",
            max_tokens=500,
            temperature=0.8,
            model="custom_model",
            system_prompt="Custom system prompt",
        )
        assert result == "Generated text"

        # Verify custom parameters were used
        called_data = mock_post.call_args[1]["json"]
        assert called_data["max_tokens"] == 500
        assert called_data["temperature"] == 0.8
        assert called_data["model"] == "custom_model"
        assert called_data["messages"][0]["content"] == "Custom system prompt"


def test_get_available_models_success(client, mock_models_response, mock_dns):
    """Test successful models retrieval."""
    with patch("requests.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = mock_models_response
        mock_get.return_value = mock_response

        models = client.get_available_models()
        assert len(models) == 2
        assert models[0]["id"] == "model1"
        assert models[1]["id"] == "model2"


def test_get_available_models_error(client, mock_dns):
    with patch("requests.get") as mock_get:
        mock_get.side_effect = RequestException("API Error")

        with pytest.raises(RequestException, match="Failed to fetch models: API Error"):
            client.get_available_models()


def test_check_health_success(client, mock_models_response, mock_dns):
    with patch("requests.get") as mock_get:
        mock_response = Mock()
        mock_response.json.return_value = mock_models_response
        mock_get.return_value = mock_response

        assert client.check_health() is True


def test_check_health_failure(client, mock_dns):
    with patch("requests.get") as mock_get:
        mock_get.side_effect = RequestException("API Error")

        assert client.check_health() is False


if __name__ == "__main__":
    pytest.main()
