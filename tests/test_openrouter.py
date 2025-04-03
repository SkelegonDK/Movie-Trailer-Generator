import os
import pytest
import requests
import json
import streamlit as st
from scripts import prompts


@pytest.fixture
def api_config():
    """Set up test environment variables and configurations"""
    # Ensure we have an API key
    api_key = os.getenv("OPENROUTER_API_KEY") or st.secrets.get("OPENROUTER_API_KEY")
    assert api_key is not None, "OpenRouter API key not found"

    # Base configuration
    return {
        "base_url": "https://openrouter.ai/api/v1",
        "headers": {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://github.com/manuelthomsen/Stupid-Movie-Trailer-Generator",
            "X-Title": "Stupid Movie Trailer Generator Tests",
            "Content-Type": "application/json",
        },
    }


def test_list_models(api_config):
    """Test listing available models"""
    url = f"{api_config['base_url']}/models"
    response = requests.get(url, headers=api_config["headers"])
    print(f"\nListing Models")
    print(f"Status Code: {response.status_code}")

    response_data = response.json()
    print("\nAvailable models:")
    for model in response_data.get("data", []):
        print(f"\nModel ID: {model.get('id')}")
        print(f"Name: {model.get('name')}")
        print(f"Context length: {model.get('context_length')}")
        print(f"Description: {model.get('description')}")
        print(f"Pricing: {model.get('pricing')}")
        print("---")

    assert response.status_code == 200
    assert "data" in response_data


def test_api_connection(api_config):
    """Test basic API connectivity"""
    url = f"{api_config['base_url']}/chat/completions"
    data = {
        "model": "openchat/openchat-7b:free",  # Using a free model for testing
        "messages": [
            {
                "role": "system",
                "content": prompts.SCRIPT_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": "Say 'test successful' if you can read this.",
            },
        ],
    }

    response = requests.post(url, json=data, headers=api_config["headers"])
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {response.headers}")
    print(f"Response Body: {response.text}")

    assert response.status_code == 200
    response_data = response.json()
    assert "choices" in response_data


@pytest.mark.parametrize(
    "model",
    [
        "openchat/openchat-7b:free",
        "undi95/toppy-m-7b:free",
    ],
)
def test_model_availability(api_config, model):
    """Test if the free models are available"""
    url = f"{api_config['base_url']}/chat/completions"
    data = {"model": model, "messages": [{"role": "user", "content": "Hi"}]}

    response = requests.post(url, json=data, headers=api_config["headers"])
    print(f"\nTesting model: {model}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:200]}...")  # Print first 200 chars

    assert response.status_code == 200


def test_script_generation(api_config):
    """Test the actual script generation functionality"""
    url = f"{api_config['base_url']}/chat/completions"
    data = {
        "model": "openchat/openchat-7b:free",
        "messages": [
            {
                "role": "system",
                "content": prompts.OPENROUTER_SCRIPT_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompts.OPENROUTER_SCRIPT_USER_PROMPT.format(
                    genre="Comedy",
                    title="Test Movie",
                    setting="Modern Day New York",
                    character="John Smith",
                    conflict="Identity Crisis",
                    plot_twist="He was a robot all along",
                ),
            },
        ],
        "temperature": 0.7,
        "max_tokens": 100,
    }

    response = requests.post(url, json=data, headers=api_config["headers"])
    print(f"\nScript Generation Test")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

    assert response.status_code == 200
    response_data = response.json()
    assert "choices" in response_data
    assert len(response_data["choices"]) > 0
    assert "message" in response_data["choices"][0]
    assert "content" in response_data["choices"][0]["message"]
