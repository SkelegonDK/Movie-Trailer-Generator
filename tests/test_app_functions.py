import pytest
from unittest.mock import patch, MagicMock
import json
import requests

# Import the functions directly from app.py for testing
# Note: This is generally not ideal, but necessary since the functions are defined in the main script
# A better approach would be to refactor them into a separate module.
from app import generate_movie_name_with_openrouter, generate_script_with_openrouter


# Mock fixtures
@pytest.fixture
def st_mock():
    mock = MagicMock()
    mock.session_state = {
        "selected_points": {
            "Genre": "Test Genre",
            "Main Character": "Test Character",
            "Setting": "Test Setting",
            "Conflict": "Test Conflict",
            "Plot Twist": "Test Plot Twist",
        },
        "selected_model": "test-model",
    }
    mock.secrets = {"OPENROUTER_API_KEY": "test-key"}
    return mock


@pytest.fixture
def prompts_mock():
    mock = MagicMock()
    mock.MOVIE_TITLE_SYSTEM_PROMPT = "Test system prompt"
    mock.MOVIE_TITLE_USER_PROMPT = "Test user prompt for {genre}"
    mock.SCRIPT_SYSTEM_PROMPT = "Test script system prompt"
    mock.SCRIPT_USER_PROMPT = "Test script prompt for {title}"
    return mock


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_movie_name_success(mock_post, prompts_mock, st_mock):
    """Test successful movie name generation"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps(
        {"choices": [{"message": {"content": "  Robot Rampage!  "}}]}
    )
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "  Robot Rampage!  "}}]
    }
    mock_post.return_value = mock_response

    title = generate_movie_name_with_openrouter(
        genre="Test Genre",
        model="test-model",
    )

    assert isinstance(title, str)
    assert title.strip() == "Robot Rampage!"


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_movie_name_api_error(mock_post, prompts_mock, st_mock):
    """Test movie name generation with API returning error status"""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_post.return_value = mock_response

    title = generate_movie_name_with_openrouter(
        genre="Test Genre",
        model="test-model",
    )

    assert title is None


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_movie_name_no_choices(mock_post, prompts_mock, st_mock):
    """Test movie name generation with API response having no choices"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"choices": []})
    mock_response.json.return_value = {"choices": []}
    mock_post.return_value = mock_response

    title = generate_movie_name_with_openrouter(
        genre="Test Genre",
        model="test-model",
    )

    assert title is None


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_movie_name_empty_title(mock_post, prompts_mock, st_mock):
    """Test movie name generation where API returns empty content"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"choices": [{"message": {"content": "  "}}]})
    mock_response.json.return_value = {"choices": [{"message": {"content": "  "}}]}
    mock_post.return_value = mock_response

    title = generate_movie_name_with_openrouter(
        genre="Test Genre",
        model="test-model",
    )

    assert title is None


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_script_success(mock_post, prompts_mock, st_mock):
    """Test successful script generation"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps(
        {
            "choices": [
                {
                    "message": {
                        "content": " In a world... BUTLER did it. Robot Rampage! "
                    }
                }
            ]
        }
    )
    mock_response.json.return_value = {
        "choices": [
            {"message": {"content": " In a world... BUTLER did it. Robot Rampage! "}}
        ]
    }
    mock_post.return_value = mock_response

    script = generate_script_with_openrouter(
        selected_points=st_mock.session_state["selected_points"],
        movie_name="Robot Rampage!",
    )

    assert isinstance(script, str)
    assert len(script.strip()) > 0


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_script_api_error(mock_post, prompts_mock, st_mock):
    """Test script generation with API returning error status"""
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Bad Request"
    mock_post.return_value = mock_response

    script = generate_script_with_openrouter(
        selected_points=st_mock.session_state["selected_points"],
        movie_name="Test Movie",
    )

    assert script is None


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_script_no_choices(mock_post, prompts_mock, st_mock):
    """Test script generation with API response having no choices"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"choices": []})
    mock_response.json.return_value = {"choices": []}
    mock_post.return_value = mock_response

    script = generate_script_with_openrouter(
        selected_points=st_mock.session_state["selected_points"],
        movie_name="Test Movie",
    )

    assert script is None


@patch("app.st")
@patch("app.prompts")
@patch("app.requests.post")
def test_generate_script_network_error(mock_post, prompts_mock, st_mock):
    """Test script generation with a network request exception"""
    mock_post.side_effect = requests.exceptions.RequestException("Network Error")

    script = generate_script_with_openrouter(
        selected_points=st_mock.session_state["selected_points"],
        movie_name="Test Movie",
    )

    assert script is None
