import streamlit as st
import os

st.title("Audio Browser")

audio_files = [f for f in os.listdir("generated_audio") if f.endswith(".mp3")]
audio_files.sort(
    key=lambda x: os.path.getmtime(os.path.join("generated_audio", x)),
    reverse=True,
)

if audio_files:
    for audio_file in audio_files:
        audio_path = os.path.join("generated_audio", audio_file)
        st.markdown(f"**{audio_file}**")
        st.audio(audio_path, format="audio/mp3")

        with open(audio_path, "rb") as file:
            st.download_button(
                label="Download",
                data=file,
                file_name=audio_file,
                mime="audio/mp3",
            )
else:
    st.write("No audio files generated yet.")
