import pytest
from unittest.mock import patch, MagicMock
import json
import requests

# Import only the movie name generation function as script generation is handled in main()
from app import generate_movie_name_with_openrouter


# Mock fixtures
@pytest.fixture
def mock_selected_points():
    return {
        "Genre": "Test Genre",
        "Main Character": "Test Character",
        "Setting": "Test Setting",
        "Conflict": "Test Conflict",
        "Plot Twist": "Test Plot Twist",
    }


@pytest.fixture
def mock_api_response():
    return {"choices": [{"message": {"content": "Robot Rampage!"}}]}


def test_generate_movie_name_success(mock_selected_points, mock_api_response):
    """Test successful movie name generation"""
    with patch("app.call_llm", return_value=mock_api_response):
        movie_name = generate_movie_name_with_openrouter(
            api_key="test_key",
            model_name="test_model",
            selected_points=mock_selected_points,
        )

        assert isinstance(movie_name, str)
        assert movie_name == "Robot Rampage!"


def test_generate_movie_name_api_error(mock_selected_points):
    """Test movie name generation with API error"""
    with patch("app.call_llm", side_effect=Exception("API Error")):
        with pytest.raises(Exception) as exc_info:
            generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )
        assert "API Error" in str(exc_info.value)


def test_generate_movie_name_no_choices(mock_selected_points):
    """Test movie name generation with API response having no choices"""
    with patch("app.call_llm", return_value={"choices": []}):
        with pytest.raises(ValueError) as exc_info:
            generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )
        assert "No valid response from API" in str(exc_info.value)


def test_generate_movie_name_empty_title(mock_selected_points):
    """Test movie name generation where API returns empty content"""
    with patch(
        "app.call_llm", return_value={"choices": [{"message": {"content": "  "}}]}
    ):
        with pytest.raises(ValueError) as exc_info:
            generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )
        assert "Empty response from API" in str(exc_info.value)


def test_generate_movie_name_missing_fields():
    """Test movie name generation with missing fields in selected points"""
    incomplete_points = {
        "Genre": "Test Genre",
        # Missing other required fields
    }

    with pytest.raises(KeyError):
        generate_movie_name_with_openrouter(
            api_key="test_key",
            model_name="test_model",
            selected_points=incomplete_points,
        )
