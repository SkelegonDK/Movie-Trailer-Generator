import pytest
import os
from pydub import AudioSegment
from scripts.functions import apply_background_music
import numpy as np


@pytest.fixture
def test_audio_files():
    """Create temporary test audio files of different lengths."""
    # Create a 3-second voice-over file
    short_voice = AudioSegment.silent(duration=3000)  # 3 seconds
    short_voice.export("tests/fixtures/voiceover_short.mp3", format="mp3")

    # Create a 10-second voice-over file
    long_voice = AudioSegment.silent(duration=10000)  # 10 seconds
    long_voice.export("tests/fixtures/voiceover_long.mp3", format="mp3")

    yield {
        "short_voice": "tests/fixtures/voiceover_short.mp3",
        "long_voice": "tests/fixtures/voiceover_long.mp3",
    }

    # Cleanup after tests
    for file in ["voiceover_short.mp3", "voiceover_long.mp3"]:
        if os.path.exists(f"tests/fixtures/{file}"):
            os.remove(f"tests/fixtures/{file}")
        final_file = f"tests/fixtures/final_{file}"
        if os.path.exists(final_file):
            os.remove(final_file)


def test_shorter_voiceover(test_audio_files):
    """Test when voice-over is shorter than background music."""
    # Apply background music to short voice-over
    output_path = apply_background_music(test_audio_files["short_voice"])
    assert output_path is not None

    # Load the resulting audio
    result_audio = AudioSegment.from_mp3(output_path)
    original_voice = AudioSegment.from_mp3(test_audio_files["short_voice"])

    # Check if lengths match (within 100ms tolerance due to encoding/decoding)
    assert abs(len(result_audio) - len(original_voice)) < 100


def test_longer_voiceover(test_audio_files):
    """Test when voice-over is longer than background music."""
    # Apply background music to long voice-over
    output_path = apply_background_music(test_audio_files["long_voice"])
    assert output_path is not None

    # Load the resulting audio
    result_audio = AudioSegment.from_mp3(output_path)
    original_voice = AudioSegment.from_mp3(test_audio_files["long_voice"])

    # Check if lengths match (within 100ms tolerance)
    assert abs(len(result_audio) - len(original_voice)) < 100


def test_audio_content_verification(test_audio_files):
    """Test that the audio content is actually being stretched/compressed properly."""
    # Apply background music to both short and long voice-overs
    short_output = apply_background_music(test_audio_files["short_voice"])
    long_output = apply_background_music(test_audio_files["long_voice"])

    assert short_output is not None
    assert long_output is not None

    # Load the output files
    short_result = AudioSegment.from_mp3(short_output)
    long_result = AudioSegment.from_mp3(long_output)

    # Verify the outputs have different lengths
    assert len(short_result) != len(long_result)

    # Verify the outputs match their respective voice-over lengths
    short_voice = AudioSegment.from_mp3(test_audio_files["short_voice"])
    long_voice = AudioSegment.from_mp3(test_audio_files["long_voice"])

    assert abs(len(short_result) - len(short_voice)) < 100
    assert abs(len(long_result) - len(long_voice)) < 100


def test_error_handling():
    """Test error handling for non-existent files."""
    result = apply_background_music("non_existent_file.mp3")
    assert result is None
