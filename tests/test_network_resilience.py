import pytest
import requests
import socket
from unittest.mock import patch, MagicMock, call
from scripts.openrouter_client import OpenRouterClient
from requests.exceptions import ConnectionError, Timeout, RequestException


@pytest.fixture
def client():
    """Create a test client with mock config"""
    with patch("scripts.openrouter_client.config") as mock_config:
        mock_config.is_valid.return_value = True
        mock_config.openrouter_api_key = "test-api-key"
        mock_config.openrouter_model = "test-model"
        return OpenRouterClient()


@pytest.fixture
def mock_dns():
    """Mock DNS resolution"""
    with patch("socket.gethostbyname") as mock:
        mock.return_value = "1.2.3.4"
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
            }
        ]
    }
    return response


def test_dns_resolution(mock_dns):
    """Test that the API domain can be resolved"""
    client = OpenRouterClient()
    client._verify_dns("api.openrouter.ai")
    mock_dns.assert_called_once_with("api.openrouter.ai")


@pytest.mark.timeout(10)
def test_api_connection_timeout(mock_config, mock_dns):
    """Test handling of connection timeouts"""
    client = OpenRouterClient()

    with patch("requests.Session.request") as mock_request:
        mock_request.side_effect = Timeout("Connection timed out")

        with pytest.raises(Timeout) as exc_info:
            client.generate_text("test prompt")

        assert "Connection timed out" in str(exc_info.value)
        assert mock_request.call_count == client.MAX_RETRIES


def test_connection_retry(mock_config, mock_dns, mock_successful_response):
    """Test that connection retries work as expected"""
    client = OpenRouterClient()

    with patch("requests.Session.request") as mock_request, patch(
        "time.sleep"
    ) as mock_sleep:  # Mock sleep to speed up tests

        # First two calls fail, third succeeds
        mock_request.side_effect = [
            ConnectionError("First failure"),
            ConnectionError("Second failure"),
            mock_successful_response,
        ]

        # Should succeed on third try
        result = client.generate_text("test prompt")
        assert result == "Test response"

        # Verify retry behavior
        assert mock_request.call_count == 3
        assert mock_sleep.call_count == 2

        # Verify sleep was called with correct delays
        expected_delays = [client.BACKOFF_FACTOR, client.BACKOFF_FACTOR * 2]
        actual_delays = [call[0][0] for call in mock_sleep.call_args_list]
        assert actual_delays == expected_delays


@pytest.mark.parametrize(
    "error,expected_message",
    [
        (ConnectionError("Connection failed"), "Connection failed"),
        (Timeout("Request timed out"), "Request timed out"),
        (
            RequestException("General request error"),
            "Request failed: General request error",
        ),
    ],
)
def test_error_handling(mock_config, mock_dns, error, expected_message):
    """Test handling of various network errors"""
    client = OpenRouterClient()

    with patch("requests.Session.request") as mock_request:
        mock_request.side_effect = error

        with pytest.raises(Exception) as exc_info:
            client.generate_text("test prompt")

        assert expected_message in str(exc_info.value)


def test_successful_retry_after_timeout(
    mock_config, mock_dns, mock_successful_response
):
    """Test successful retry after a timeout"""
    client = OpenRouterClient()

    with patch("requests.Session.request") as mock_request, patch(
        "time.sleep"
    ) as mock_sleep:  # Mock sleep to speed up tests

        # First call times out, second succeeds
        mock_request.side_effect = [
            Timeout("Connection timed out"),
            mock_successful_response,
        ]

        # Should succeed on second try
        result = client.generate_text("test prompt")

        assert result == "Test response"
        assert mock_request.call_count == 2
        assert mock_sleep.call_count == 1
        assert mock_sleep.call_args[0][0] == client.BACKOFF_FACTOR


def test_dns_failure_handling(mock_config):
    """Test handling of DNS resolution failures"""
    client = OpenRouterClient()

    with patch("socket.gethostbyname") as mock_dns:
        mock_dns.side_effect = socket.gaierror(
            "[Errno 8] nodename nor servname provided, or not known"
        )

        with pytest.raises(ConnectionError) as exc_info:
            client._verify_dns("api.openrouter.ai")

        assert "DNS resolution failed" in str(exc_info.value)
        mock_dns.assert_called_once()


@pytest.mark.integration
def test_live_api_connection(mock_config, mock_models_response):
    """Test live API connection (marked as integration test)"""
    client = OpenRouterClient()

    with patch("requests.Session.request", return_value=mock_models_response):
        try:
            response = client.get_available_models()
            assert isinstance(response, list)
            assert len(response) == 1
            assert response[0]["id"] == "model1"
        except RequestException as e:
            pytest.fail(f"Failed to connect to live API: {str(e)}")


def test_retry_backoff(mock_config, mock_dns):
    """Test that retry backoff is working correctly"""
    client = OpenRouterClient()

    with patch("requests.Session.request") as mock_request, patch(
        "time.sleep"
    ) as mock_sleep:  # Mock sleep to speed up tests

        mock_request.side_effect = [
            ConnectionError("First failure"),
            ConnectionError("Second failure"),
            ConnectionError("Third failure"),
        ]

        with pytest.raises(ConnectionError):
            client.generate_text("test prompt")

        # Check that sleep was called with increasing delays
        expected_delays = [client.BACKOFF_FACTOR, client.BACKOFF_FACTOR * 2]
        actual_delays = [call[0][0] for call in mock_sleep.call_args_list]

        assert len(actual_delays) == len(expected_delays)
        for actual, expected in zip(actual_delays, expected_delays):
            assert (
                abs(actual - expected) < 0.1
            )  # Allow small floating point differences


def test_invalid_response_format(mock_config, mock_dns):
    """Test handling of invalid response formats"""
    client = OpenRouterClient()

    invalid_response = MagicMock()
    invalid_response.json.return_value = {"invalid": "format"}

    with patch("requests.Session.request", return_value=invalid_response):
        with pytest.raises(RequestException) as exc_info:
            client.generate_text("test prompt")

        assert "Invalid response format" in str(exc_info.value)
