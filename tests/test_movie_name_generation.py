import pytest
from unittest.mock import patch, MagicMock
import streamlit as st
from app import generate_movie_name_with_openrouter


@pytest.fixture
def mock_selected_points():
    """Mock story points for testing."""
    return {
        "Genre": "Science Fiction",
        "Main Character": "AI Robot",
        "Setting": "Dystopian Future",
        "Conflict": "Fighting against human oppression",
        "Plot Twist": "The robots were programmed by future humans",
    }


@pytest.fixture
def mock_api_response():
    """Mock OpenRouter API response."""
    return {"choices": [{"message": {"content": "Digital Liberation"}}]}


def test_generate_movie_name_success(mock_selected_points, mock_api_response):
    """Test successful movie name generation."""
    with patch("app.call_llm", return_value=mock_api_response):
        movie_name = generate_movie_name_with_openrouter(
            api_key="test_key",
            model_name="test_model",
            selected_points=mock_selected_points,
        )

        assert isinstance(movie_name, str)
        assert movie_name == "Digital Liberation"
        assert len(movie_name.split()) <= 5  # Verify title length constraint


def test_generate_movie_name_empty_response(mock_selected_points):
    """Test handling of empty API response."""
    empty_response = {"choices": []}
    with patch("app.call_llm", return_value=empty_response):
        with pytest.raises(ValueError) as exc_info:
            generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )
        assert "No valid response from API" in str(exc_info.value)


def test_generate_movie_name_invalid_response(mock_selected_points):
    """Test handling of invalid API response format."""
    invalid_response = {"choices": [{"message": {"content": "   "}}]}
    with patch("app.call_llm", return_value=invalid_response):
        with pytest.raises(ValueError) as exc_info:
            generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )
        assert "Empty response from API" in str(exc_info.value)


def test_generate_movie_name_api_error(mock_selected_points):
    """Test handling of API errors."""
    with patch("app.call_llm", side_effect=Exception("API Error")):
        with pytest.raises(Exception) as exc_info:
            generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )
        assert "API Error" in str(exc_info.value)


def test_generate_movie_name_missing_fields():
    """Test handling of missing fields in selected points."""
    incomplete_points = {
        "Genre": "Science Fiction",
        # Missing other required fields
    }

    with pytest.raises(KeyError):
        generate_movie_name_with_openrouter(
            api_key="test_key",
            model_name="test_model",
            selected_points=incomplete_points,
        )


def test_generate_movie_name_format_constraints(mock_selected_points):
    """Test that generated movie names follow format constraints."""
    test_responses = [
        {"choices": [{"message": {"content": "A"}}]},  # Single word
        {"choices": [{"message": {"content": "A B C D E"}}]},  # Five words
        {"choices": [{"message": {"content": "The Matrix"}}]},  # Two words
    ]

    for response in test_responses:
        with patch("app.call_llm", return_value=response):
            movie_name = generate_movie_name_with_openrouter(
                api_key="test_key",
                model_name="test_model",
                selected_points=mock_selected_points,
            )

            # Verify title constraints
            words = movie_name.split()
            assert 1 <= len(words) <= 5, "Movie title should be between 1 and 5 words"
            assert all(word.strip() for word in words), "All words should be non-empty"
