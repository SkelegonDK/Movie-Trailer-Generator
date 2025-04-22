import os
import streamlit as st
from scripts.functions import cleanup_old_audio_files  # Import the cleanup function


st.title("Audio Browser")

AUDIO_DIR = "generated_audio"

# --- Run cleanup first ---
# Ensure the directory exists before trying to clean/list
os.makedirs(AUDIO_DIR, exist_ok=True)
try:
    deleted_count = cleanup_old_audio_files(
        directory=AUDIO_DIR, max_age_hours=24, max_files=100
    )
    if deleted_count > 0:
        st.toast(
            f"🧹 Cleaned up {deleted_count} old audio file(s) (> 24 hours or over 100 files)."
        )
except Exception as e:
    # Catch potential errors during cleanup itself, although the function has internal handling
    st.error(f"An error occurred during audio cleanup: {e}")
    # Optionally st.stop() here if cleanup failure is critical
# --- End Cleanup ---

# --- List remaining audio files ---
try:
    audio_files = [f for f in os.listdir(AUDIO_DIR) if f.endswith(".mp3")]
    # Sort by modification time, newest first
    audio_files.sort(
        key=lambda x: os.path.getmtime(os.path.join(AUDIO_DIR, x)),
        reverse=True,
    )
except FileNotFoundError:
    st.error(f"Error: The audio directory '{AUDIO_DIR}' was not found.")
    audio_files = []  # Ensure audio_files is defined
except Exception as e:
    st.error(f"An error occurred while accessing audio files: {e}")
    audio_files = []  # Ensure audio_files is defined
# --- End Listing ---

if audio_files:
    st.write(f"Found {len(audio_files)} audio file(s):")  # Added count
    for audio_file in audio_files:
        try:
            audio_path = os.path.join(AUDIO_DIR, audio_file)
            st.markdown(f"**{audio_file}**")
            # Display audio player
            st.audio(audio_path, format="audio/mp3")

            # Add download button
            with open(audio_path, "rb") as file:
                st.download_button(
                    label="Download",
                    data=file,
                    file_name=audio_file,
                    mime="audio/mp3",
                    key=f"download_{audio_file}",  # Add unique key for buttons
                )
            st.markdown("---")  # Add separator
        except FileNotFoundError:
            st.warning(
                f"Could not load file '{audio_file}'. It might have been deleted."
            )
        except Exception as e:
            st.error(f"An error occurred displaying file '{audio_file}': {e}")
else:
    st.info("No audio files found in the generated audio directory.")  # Changed message
