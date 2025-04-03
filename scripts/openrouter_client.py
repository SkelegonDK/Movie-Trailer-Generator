import requests
import json
import streamlit as st
from typing import List, Dict, Any, Optional
from config import Config
from scripts import prompts
import socket
from requests.exceptions import RequestException


class OpenRouterClient:
    """Client for interacting with OpenRouter API."""

    BASE_URL = "https://api.openrouter.ai/api/v1"

    def __init__(self, config: Optional[Config] = None):
        """Initialize the OpenRouter client.

        Args:
            config: Optional Config instance. If not provided, will load from environment.
        """
        self.config = config or Config.load()
        if not self.config.is_valid():
            raise ValueError("OpenRouter API key not configured")

        self.headers = {
            "Authorization": f"Bearer {st.secrets.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "X-Title": "Stupid Movie Trailer Generator",
        }

    def _verify_dns(self, hostname: str) -> bool:
        """Verify DNS resolution for a hostname."""
        try:
            socket.gethostbyname(hostname)
            return True
        except socket.gaierror as e:
            raise ConnectionError(f"DNS resolution failed: {str(e)}")

    def generate_text(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.5,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate text using OpenRouter API.

        Args:
            prompt: The prompt to generate text from
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            model: Optional model override
            system_prompt: Optional system prompt override

        Returns:
            Generated text string

        Raises:
            RequestException: If the request fails
        """
        try:
            # Verify DNS resolution first
            self._verify_dns("api.openrouter.ai")

            messages = [
                {
                    "role": "system",
                    "content": system_prompt or prompts.OPENROUTER_SCRIPT_SYSTEM_PROMPT,
                },
                {"role": "user", "content": prompt},
            ]

            data = {
                "model": model or self.config.openrouter_model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }

            response = requests.post(
                url=f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json=data,
            )
            response.raise_for_status()
            result = response.json()

            return result["choices"][0]["message"]["content"]

        except Exception as e:
            raise RequestException(f"OpenRouter API request failed: {str(e)}")

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models from OpenRouter.

        Returns:
            List of model information dictionaries

        Raises:
            RequestException: If the request fails
        """
        try:
            # Verify DNS resolution first
            self._verify_dns("api.openrouter.ai")

            response = requests.get(
                url=f"{self.BASE_URL}/models",
                headers=self.headers,
            )
            response.raise_for_status()
            result = response.json()

            return result["data"]

        except Exception as e:
            raise RequestException(f"Failed to fetch models: {str(e)}")

    def check_health(self) -> bool:
        """Check if OpenRouter API is accessible."""
        try:
            # Try to resolve DNS first
            self._verify_dns("api.openrouter.ai")

            # Try to list models as a health check
            self.get_available_models()
            return True

        except Exception as e:
            print(f"Health check failed: {str(e)}")
            return False
