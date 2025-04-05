import openai
import os
from typing import Optional, Any

# Consider loading base_url and api_key from environment variables or a config file
# for better security and flexibility.
# Example:
# OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama") # Default for Ollama compatibility mode
# OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")


def call_llm(
    model_name: str, prompt: str, api_key: str, base_url: str, **kwargs: Any
) -> Optional[str]:
    """
    Calls a Large Language Model (LLM) using the OpenAI API standard.

    This function can interact with any OpenAI-compatible API, including
    Ollama (in compatibility mode) and OpenRouter, by specifying the
    appropriate base_url and api_key.

    Args:
        model_name: The name of the model to use (e.g., "gpt-3.5-turbo", "llama3", "openrouter/mistralai/mistral-7b-instruct").
        prompt: The user's prompt as a simple string.
        api_key: The API key for the target service.
        base_url: The base URL of the target API endpoint (e.g., "https://openrouter.ai/api/v1", "http://localhost:11434/v1").
        **kwargs: Additional keyword arguments to pass directly to the
                  openai.chat.completions.create method (e.g., temperature, max_tokens).

    Returns:
        The text content of the LLM's response, or None if an error occurs
        that isn't re-raised.

    Raises:
        openai.AuthenticationError: If the API key is invalid.
        openai.NotFoundError: If the model or resource is not found.
        openai.APIConnectionError: If there's trouble connecting to the API.
        openai.RateLimitError: If the rate limit is exceeded.
        openai.APITimeoutError: If the request times out.
        openai.APIError: For other generic OpenAI API errors.
        Exception: For any other unexpected errors during the process.
    """
    print(f"--- Calling LLM ---")
    print(f"Base URL: {base_url}")
    print(f"Model: {model_name}")
    # Avoid printing the actual API key for security
    print(f"API Key Provided: {'Yes' if api_key else 'No'}")
    print(f"Prompt: {prompt[:100]}...")  # Print truncated prompt
    print(f"Additional Args: {kwargs}")

    try:
        # Instantiate the client within the try block in case base_url is invalid?
        # No, OpenAI client doesn't seem to validate eagerly. Keep it outside for clarity.
        client = openai.OpenAI(
            base_url=base_url,
            api_key=api_key,
        )

        messages = [{"role": "user", "content": prompt}]

        completion = client.chat.completions.create(
            model=model_name, messages=messages, **kwargs
        )

        # Extract response content
        response_content = None
        if completion.choices:
            message = completion.choices[0].message
            if message:
                response_content = message.content

        print(f"Raw completion object: {completion}")  # Log raw object for debugging
        print(
            f"Extracted response: {response_content[:100] if response_content else 'None'}..."
        )

        if response_content is None:
            print("Warning: LLM response content was empty or missing.")
            # Decide if empty response is an error or valid case. Returning None for now.
            return None

        return response_content.strip()

    except openai.AuthenticationError as e:
        print(f"ERROR: OpenAI Authentication Error: {e}")
        raise  # Re-raise for the caller (Streamlit app) to handle
    except openai.NotFoundError as e:
        print(f"ERROR: OpenAI Not Found Error (check model name or API path?): {e}")
        raise
    except openai.APIConnectionError as e:
        print(
            f"ERROR: OpenAI API Connection Error (is the server running/reachable?): {e}"
        )
        raise
    except openai.RateLimitError as e:
        print(f"ERROR: OpenAI Rate Limit Error: {e}")
        raise
    except openai.APITimeoutError as e:
        print(f"ERROR: OpenAI API Timeout Error: {e}")
        raise
    except openai.APIError as e:  # Catch broader OpenAI errors
        print(f"ERROR: Generic OpenAI API Error: {e}")
        raise
    except Exception as e:  # Catch any other unexpected errors
        print(f"ERROR: An unexpected error occurred in call_llm: {e}")
        raise
