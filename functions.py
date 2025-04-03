import requests
import streamlit as st


def generate_script_with_ollama(prompt):
    """Generate a script using the local Ollama API"""
    url = "http://localhost:11434/api/generate"
    data = {"model": "llama2", "prompt": prompt, "stream": False}

    try:
        response = requests.post(url, json=data)
        response.raise_for_status()
        response_data = response.json()
        return response_data.get("response", "")
    except requests.exceptions.RequestException as e:
        st.error(f"Error calling Ollama API: {str(e)}")
        return None
