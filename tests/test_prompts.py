import pytest
from scripts import prompts, functions
import json


@pytest.fixture
def mock_selected_points():
    return {
        "Genre": "Sci-Fi",
        "Setting": "Post-apocalyptic Walmart",
        "Main Character": "The Joker",
        "Conflict": "War Against Sentient Mold",
        "Plot Twist": "Everything Was a Cat's Dream",
    }


def test_movie_title_prompt_formatting(mock_selected_points):
    """Test that movie title prompt formatting is correct."""
    formatted_prompt = prompts.MOVIE_TITLE_USER_PROMPT.format(
        genre=mock_selected_points["Genre"],
        main_character=mock_selected_points["Main Character"],
        setting=mock_selected_points["Setting"],
        conflict=mock_selected_points["Conflict"],
        plot_twist=mock_selected_points["Plot Twist"],
    )

    # Check that all elements are present
    assert mock_selected_points["Genre"] in formatted_prompt
    assert mock_selected_points["Main Character"] in formatted_prompt
    assert mock_selected_points["Setting"] in formatted_prompt
    assert mock_selected_points["Conflict"] in formatted_prompt
    assert mock_selected_points["Plot Twist"] in formatted_prompt

    # Check format guidelines are present
    assert "short and memorable" in formatted_prompt
    assert "1-5 words" in formatted_prompt


def test_script_prompt_formatting(mock_selected_points):
    """Test that script prompt formatting is correct."""
    mock_movie_name = "The Moldy Awakening"
    formatted_prompt = prompts.SCRIPT_USER_PROMPT.format(
        title=mock_movie_name,
        genre=mock_selected_points["Genre"],
        setting=mock_selected_points["Setting"],
        character=mock_selected_points["Main Character"],
        conflict=mock_selected_points["Conflict"],
        plot_twist=mock_selected_points["Plot Twist"],
    )

    # Check that all elements are present
    assert mock_movie_name in formatted_prompt
    assert mock_selected_points["Genre"] in formatted_prompt
    assert mock_selected_points["Setting"] in formatted_prompt
    assert mock_selected_points["Main Character"] in formatted_prompt
    assert mock_selected_points["Conflict"] in formatted_prompt
    assert mock_selected_points["Plot Twist"] in formatted_prompt

    # Check formatting rules are present
    assert "UPPERCASE" in formatted_prompt
    assert "60 words" in formatted_prompt
    assert "dramatic pauses" in formatted_prompt


def test_movie_name_generation_output_format(mock_selected_points):
    """Test that generated movie names follow the correct format."""
    result = functions.generate_movie_name_with_id(
        genre=mock_selected_points["Genre"],
        main_character=mock_selected_points["Main Character"],
        setting=mock_selected_points["Setting"],
        conflict=mock_selected_points["Conflict"],
        plot_twist=mock_selected_points["Plot Twist"],
    )

    # Skip if API is not available
    if result is None:
        pytest.skip("API not available")

    # Verify result structure
    assert isinstance(result, dict)
    assert "movie_name" in result
    assert isinstance(result["movie_name"], str)

    # Verify title constraints
    movie_name = result["movie_name"]
    words = movie_name.split()
    assert len(words) <= 5, "Movie title should not exceed 5 words"
    assert len(words) > 0, "Movie title should not be empty"


def test_script_generation_output_format(mock_selected_points):
    """Test that generated scripts follow the correct format."""
    mock_movie_name = "Test Movie"

    # Test Ollama script generation
    ollama_result = functions.generate_script_with_ollama(
        selected_points=mock_selected_points, movie_name=mock_movie_name
    )

    # Skip if API is not available
    if ollama_result is None:
        pytest.skip("Ollama API not available")

    # Verify word count
    words = ollama_result.split()
    assert len(words) <= 60, "Script should not exceed 60 words"

    # Verify formatting
    assert any(
        word.isupper() for word in words
    ), "Script should contain at least one emphasized word"

    # Verify punctuation
    assert any(
        char in ollama_result for char in [",", ".", "-"]
    ), "Script should contain proper punctuation"

    # Verify movie title inclusion
    assert mock_movie_name in ollama_result, "Script should include the movie title"

    # Test OpenRouter script generation
    openrouter_result = functions.generate_script_with_openrouter(
        selected_points=mock_selected_points, movie_name=mock_movie_name
    )

    # Skip if API is not available
    if openrouter_result is None:
        pytest.skip("OpenRouter API not available")

    # Verify word count
    words = openrouter_result.split()
    assert len(words) <= 60, "Script should not exceed 60 words"

    # Verify formatting
    assert any(
        word.isupper() for word in words
    ), "Script should contain at least one emphasized word"

    # Verify punctuation
    assert any(
        char in openrouter_result for char in [",", ".", "-"]
    ), "Script should contain proper punctuation"

    # Verify movie title inclusion
    assert mock_movie_name in openrouter_result, "Script should include the movie title"
