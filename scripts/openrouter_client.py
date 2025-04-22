import requests
import json
import streamlit as st
from typing import List, Dict, Any, Optional
from config import Config
from scripts import prompts
import socket
from requests.exceptions import RequestException
from utils.api_key_manager import APIKeyManager
import time
import hashlib


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

        api_key = (
            APIKeyManager.get_api_key("OPENROUTER_API_KEY")
            or self.config.openrouter_api_key
        )
        if not api_key:
            raise ValueError("OpenRouter API key not found in session or config")

        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Title": "Stupid Movie Trailer Generator",
        }

        # Initialize caches in session state
        if not hasattr(st.session_state, "openrouter_cache"):
            st.session_state.openrouter_cache = {
                "dns_verified": False,
                "models": None,
                "responses": {},
                "last_request_time": 0,
                "failure_count": 0,  # For circuit breaker
                "circuit_opened_at": None,  # For circuit breaker
            }

        # Rate limiting settings
        self.min_request_interval = 1.0  # Minimum seconds between requests
        self.circuit_breaker_threshold = 3  # Number of consecutive failures
        self.circuit_breaker_timeout = 300  # 5 minutes in seconds

    def _verify_dns(self, hostname: str) -> bool:
        """Verify DNS resolution for a hostname with caching."""
        if st.session_state.openrouter_cache["dns_verified"]:
            return True

        try:
            socket.gethostbyname(hostname)
            st.session_state.openrouter_cache["dns_verified"] = True
            return True
        except socket.gaierror as e:
            raise ConnectionError(f"DNS resolution failed: {str(e)}")

    def _rate_limit(self):
        """Implement rate limiting between requests."""
        current_time = time.time()
        time_since_last = (
            current_time - st.session_state.openrouter_cache["last_request_time"]
        )

        if time_since_last < self.min_request_interval:
            time.sleep(self.min_request_interval - time_since_last)

        st.session_state.openrouter_cache["last_request_time"] = time.time()

    def _get_cache_key(self, prompt: str, **params) -> str:
        """Generate a cache key for a request."""
        cache_data = {"prompt": prompt, **params}
        return hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    def _circuit_breaker_check(self):
        cache = st.session_state.openrouter_cache
        if cache["failure_count"] >= self.circuit_breaker_threshold:
            if cache["circuit_opened_at"] is None:
                cache["circuit_opened_at"] = time.time()
            elapsed = time.time() - cache["circuit_opened_at"]
            if elapsed < self.circuit_breaker_timeout:
                raise RequestException(
                    f"OpenRouter temporarily disabled due to repeated failures. Please wait {int(self.circuit_breaker_timeout - elapsed)} seconds and try again."
                )
            else:
                # Reset circuit breaker after timeout
                cache["failure_count"] = 0
                cache["circuit_opened_at"] = None

    def _circuit_breaker_record_failure(self):
        cache = st.session_state.openrouter_cache
        cache["failure_count"] += 1
        if cache["failure_count"] >= self.circuit_breaker_threshold:
            cache["circuit_opened_at"] = time.time()

    def _circuit_breaker_record_success(self):
        cache = st.session_state.openrouter_cache
        cache["failure_count"] = 0
        cache["circuit_opened_at"] = None

    def generate_text(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.5,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate text using OpenRouter API with caching.

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
        # Circuit breaker check
        self._circuit_breaker_check()

        # Check cache first
        cache_key = self._get_cache_key(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            model=model,
            system_prompt=system_prompt,
        )

        if cache_key in st.session_state.openrouter_cache["responses"]:
            return st.session_state.openrouter_cache["responses"][cache_key]

        try:
            # Verify DNS resolution first
            self._verify_dns("api.openrouter.ai")

            # Apply rate limiting
            self._rate_limit()

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

            generated_text = result["choices"][0]["message"]["content"]

            # Cache the response
            st.session_state.openrouter_cache["responses"][cache_key] = generated_text
            self._circuit_breaker_record_success()
            return generated_text

        except Exception as e:
            self._circuit_breaker_record_failure()
            # Log error for monitoring
            print(f"[OpenRouterClient Error] {type(e).__name__}: {e}")
            raise RequestException(
                f"OpenRouter API request failed [{type(e).__name__}]: {str(e)}"
            )

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models from OpenRouter with caching.

        Returns:
            List of model information dictionaries

        Raises:
            RequestException: If the request fails
        """
        # Circuit breaker check
        self._circuit_breaker_check()

        # Check cache first
        if st.session_state.openrouter_cache["models"] is not None:
            return st.session_state.openrouter_cache["models"]

        try:
            # Verify DNS resolution first
            self._verify_dns("api.openrouter.ai")

            # Apply rate limiting
            self._rate_limit()

            response = requests.get(
                url=f"{self.BASE_URL}/models",
                headers=self.headers,
            )
            response.raise_for_status()
            result = response.json()

            # Cache the models
            st.session_state.openrouter_cache["models"] = result["data"]
            self._circuit_breaker_record_success()
            return result["data"]

        except Exception as e:
            self._circuit_breaker_record_failure()
            # Log error for monitoring
            print(f"[OpenRouterClient Error] {type(e).__name__}: {e}")
            raise RequestException(
                f"Failed to fetch models [{type(e).__name__}]: {str(e)}"
            )

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
