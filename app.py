import os
import streamlit as st
import random
import requests
from datetime import datetime
import json
from scripts.functions import (
    get_trailer_points,
    generate_with_llama3,
    card,
    generate_script_with_ollama,
    generate_movie_name,
    generate_image_prompts,
    generate_audio_with_elevenlabs,
    save_audio_file,
    save_movie_data,
)


def main():
    st.set_page_config(page_title="Movie Trailer Generator", layout="wide")
    st.title("Movie Trailer Generator")

    trailer_points = get_trailer_points()
    colors = ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFDFBA"]

    if "selected_points" not in st.session_state:
        st.session_state.selected_points = {
            point["category"]: random.choice(point["options"])
            for point in trailer_points
        }
    if "movie_name" not in st.session_state:
        st.session_state.movie_name = ""  # Initialize as an empty string

    if "image_prompts" not in st.session_state:
        st.session_state.image_prompts = []  # Initialize as an empty list

    if "generated_script" not in st.session_state:
        st.session_state.generated_script = ""  # Initialize as an empty string

    # Create three columns: one for the cards, one for the main content, and one for the audio browser
    card_col, main_col, audio_col = st.columns([1, 2, 1])

    # Cards column
    with card_col:
        st.subheader("Selected Elements")
        for point, color in zip(trailer_points, colors):
            category = point["category"]
            option = st.session_state.selected_points[category]
            card(category, option, color)

            if st.button(
                f"🎲 Randomize {category}",
                key=f"randomize_{category}",
                use_container_width=True,
            ):
                st.session_state.selected_points[category] = random.choice(
                    point["options"]
                )
                st.rerun()

        if st.button("🎲 Randomize All", use_container_width=True):
            st.session_state.selected_points = {
                point["category"]: random.choice(point["options"])
                for point in trailer_points
            }
            st.rerun()

    # Main content column
    with main_col:
        if st.button("Generate Voice-Over Script"):
            prompt = f"""Generate a dramatic movie trailer voice-over script based on these elements:

                Genre: {st.session_state.selected_points['Genre']}
                Setting: {st.session_state.selected_points['Setting']}
                Main Character: {st.session_state.selected_points['Main Character']}
                Conflict: {st.session_state.selected_points['Conflict']}
                Plot Twist: {st.session_state.selected_points['Plot Twist']}

                Guidelines:
                - Write ONLY the voice-over script, nothing else.
                - Use a dramatic, intense tone typical of movie trailers.
                - Include powerful, attention-grabbing phrases.
                - Allude to the plot twist without revealing it entirely.
                - Keep it between 50-75 words.
                - Do not include any audio cues, sound effects, or scene descriptions.
                - Focus solely on what the narrator would say in the trailer.
                - add impact to specific words or phrases using uppercase.

                Formatting instructions:

                - Do not include notes or comments.
                - Do not include the title of the movie.
                """

            with st.spinner("Generating voice-over script..."):
                script = generate_script_with_ollama(prompt)

            if script:
                formatted_script = "\n\n".join(
                    [line.strip() for line in script.split("\n") if line.strip()]
                )
                st.session_state.generated_script = formatted_script
                st.session_state.script_generated = True
            else:
                st.error("Failed to generate script. Please try again.")
                st.session_state.script_generated = False

        # Display the script if it exists
        if st.session_state.get("script_generated", False):
            st.text_area(
                "Generated Voice-Over Script",
                st.session_state.generated_script,
                height=200,
            )

            if st.button("Generate Voice over"):
                with st.spinner("Generating audio..."):
                    audio = generate_audio_with_elevenlabs(
                        st.session_state.generated_script
                    )
                if audio:
                    # Save the audio file
                    audio_file_path = save_audio_file(
                        audio, st.session_state.selected_points
                    )

                    # Play the audio
                    st.audio(audio, format="audio/mp3")

                    # Provide download button
                    with open(audio_file_path, "rb") as file:
                        st.download_button(
                            label="Download Audio",
                            data=file,
                            file_name=os.path.basename(audio_file_path),
                            mime="audio/mp3",
                        )

                    st.success(f"Audio saved to {audio_file_path}")
                else:
                    st.error("Failed to generate audio. Please try again.")

        st.markdown("### Storyboard")
        col1, col2, empty_col = st.columns([1, 1, 2])
        with col1:
            if st.button("Generate Movie Name"):
                with st.spinner("Generating movie name..."):
                    movie_name_response = generate_movie_name(
                        st.session_state.generated_script
                    )
                if movie_name_response:
                    st.session_state.movie_name = movie_name_response.get(
                        "movie_name", ""
                    )  # Save in session state
                    st.success(f"Generated Movie Name: {st.session_state.movie_name}")

                    # Save movie data to JSON
                    save_movie_data(
                        st.session_state.movie_name,
                        st.session_state.image_prompts,
                        st.session_state.generated_script,
                    )  # Pass the script
                else:
                    st.error("Failed to generate movie name. Please try again.")

            with col2:
                if st.button("Generate Image Prompts"):
                    with st.spinner("Generating image prompts..."):
                        image_prompts_response = generate_image_prompts(
                            st.session_state.generated_script,
                            st.session_state.selected_points,
                        )
                    if image_prompts_response:
                        st.session_state.image_prompts = image_prompts_response.get(
                            "image_prompts", []
                        )  # Save in session state
                        st.success("Image prompts generated successfully!")
                        st.text_area(
                            "Image Prompts", st.session_state.image_prompts, height=200
                        )

                        # Save movie data to JSON
                        save_movie_data(
                            st.session_state.movie_name,
                            st.session_state.image_prompts,
                            st.session_state.generated_script,
                        )  # Pass the script
                    else:
                        st.error("Failed to generate image prompts. Please try again.")
            with empty_col:
                st.markdown(st.session_state.movie_name)
                st.write(json.dumps(st.session_state.image_prompts))

        with st.expander("Generated Audio Files"):
            st.subheader("Generated Audio Files")
            audio_files = [
                f for f in os.listdir("generated_audio") if f.endswith(".mp3")
            ]
            audio_files.sort(
                key=lambda x: os.path.getmtime(os.path.join("generated_audio", x)),
                reverse=True,
            )

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


if __name__ == "__main__":
    main()
