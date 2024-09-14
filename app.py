import streamlit as st
import random


def get_trailer_points():
    return [
        {
            "category": "Genre",
            "options": [
                "Sci-Fi",
                "Horror",
                "Romcom",
                "Stoner Comedy",
                "Mockumentary",
                "Psychological Thriller",
                "Musical About Taxes",
                "Erotic Claymation",
                "Noir Cooking Show",
                "Interpretive Dance Biography",
                "Mumblecore Superhero",
                "ASMR Action",
                "Existential Slapstick",
                "Baroque Cyberpunk",
                "Surrealist Western",
                # Added monster-related and bad movie reference genres
                "Kaiju Rom-Com",
                "Sharknado-style Disaster",
                "The Room-esque Drama",
                "Godzilla vs. Taxes",
                "Plan 9 From Outer Space Remake",
            ],
        },
        {
            "category": "Setting",
            "options": [
                "Post-apocalyptic Walmart",
                "Medieval Times Restaurant",
                "Sentient IKEA",
                "Alien Planet Made of Cheese",
                "Inside Nicolas Cage's Mind",
                "Underwater Burning Man",
                "Steampunk Amish Community",
                "Virtual Reality Retirement Home",
                "Haunted Porta-Potty",
                "Secret Underground Meme Factory",
                "Floating City of Inflatable Furniture",
                "Time-Traveling Taco Truck",
                "Interdimensional DMV",
                # Added monster-related and bad movie reference settings
                "Tokyo During a Kaiju Attack",
                "Troll 2's Nilbog",
                "Cloverfield's Shaky Cam New York",
                "Gargantuan Monster Petting Zoo",
                "B-Movie Spaceship Interior",
            ],
        },
        {
            "category": "Main Character",
            "options": [
                "Depressed Superhero",
                "Conspiracy Theorist Grandma",
                "Incompetent Ninja",
                "Passive-Aggressive AI",
                "Vegan Vampire",
                "Social Media Influencer from 1692",
                "Procrastinating Doomsday Prepper",
                "Narcoleptic Secret Agent",
                "Extremely Polite Axe Murderer",
                "Hypochondriac Immortal",
                "Amnesiac Shapeshifter Who Forgot How to Shift",
                "Trust Fund Hobo",
                "Lactose Intolerant Cheesemaker",
                # Added monster-related and bad movie reference characters
                "Misunderstood Gentle Kaiju",
                "Tommy Wiseau Impersonator",
                "Shark Tornado Survivor",
                "Godzilla's Therapist",
                "Ed Wood's Long-Lost Grandchild",
            ],
        },
        {
            "category": "Conflict",
            "options": [
                "War Against Sentient Mold",
                "Alien Invasion of Telemarketers",
                "Apocalyptic Coffee Shortage",
                "Outbreak of Excessive Politeness",
                "Time Travelers vs. History Podcasters",
                "Battle Royale of MLM Huns",
                "Conspiracy to Replace All Pets with Roombas",
                "Hostile Takeover by Sarcastic AI",
                "Yoga Cult Uprising",
                "Invasion of Passive-Aggressive Post-it Notes",
                "Global Hair Gel Shortage Threatens Civilization",
                # Added monster-related and bad movie reference conflicts
                "Kaiju Labor Union Strike",
                "Attack of the Killer Tomatoes Sequel",
                "The Birds, but with Penguins",
                "Godzilla vs. King Kong vs. Homeowners Association",
                "Battlefield Earth Appreciation Society Revolt",
            ],
        },
        {
            "category": "Plot Twist",
            "options": [
                "Everything Was Just a Cat's Dream",
                "Main Character Is Actually a Sentient Sock Puppet",
                "Villain Turns Out to Be the Protagonist's Future Self",
                "Earth Is Actually Flat (And It's a Pizza)",
                "Entire Movie Was an Elaborate Ruse to Sell Timeshares",
                "All Characters Are the Same Person",
                "Climactic Battle Resolves Through Aggressive Interpretive Dance",
                "Narrator Was a Pathological Liar",
                "Civilization Is Run by Hyper-Intelligent Hamsters in People Suits",
                "It Was All a Misunderstanding",
                # Added monster-related and bad movie reference plot twists
                "Kaiju Were Cake All Along",
                "Entire Movie Was Tommy Wiseau's Dream",
                "Twist Ending Doesn't Make Sense, Just Like in Signs",
                "Everyone Was a Kaiju in a Human Suit",
                "Dramatic Reveal of Rubber Monster Suit Zipper",
            ],
        },
    ]


def card(category, option, color):
    st.markdown(
        f"""
    <div style="
        background-color: {color};
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
        height: auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    ">
        <h3 style="color: #333; margin: 0; font-size: 1.2em;">{category}</h3>
        <p style="font-size: 1.4em; margin: 10px 0; font-weight: bold; color: #333;">{option}</p>
    </div>
    """,
        unsafe_allow_html=True,
    )


def generate_script_with_ollama(prompt):
    url = "http://localhost:11434/api/generate"
    data = {"model": "mistral", "prompt": prompt, "stream": False}
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json()["response"]
    else:
        st.error(f"Error generating script: {response.text}")
        return None


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

    cols = st.columns(5)

    for i, (point, color) in enumerate(zip(trailer_points, colors)):
        with cols[i]:
            category = point["category"]
            option = st.session_state.selected_points[category]
            card(category, option, color)

    if st.button("🎲 Randomize"):
        st.session_state.selected_points = {
            point["category"]: random.choice(point["options"])
            for point in trailer_points
        }
        st.rerun()

    if st.button("Generate Trailer Script"):
        prompt = f"""Create a movie trailer script for a film with the following elements:
        Genre: {st.session_state.selected_points['Genre']}
        Setting: {st.session_state.selected_points['Setting']}
        Main Character: {st.session_state.selected_points['Main Character']}
        Conflict: {st.session_state.selected_points['Conflict']}
        Plot Twist: {st.session_state.selected_points['Plot Twist']}

        The script should be dramatic and engaging, following this structure:
        1. A powerful opening line
        2. Introduction of the setting and main character
        3. Escalation of the conflict
        4. Hint at the plot twist
        5. Climactic moment
        6. Closing tagline

        Keep the script between 100-150 words."""

        with st.spinner("Generating trailer script..."):
            script = generate_script_with_ollama(prompt)

        if script:
            st.session_state.generated_script = script
            st.text_area("Generated Script", script, height=300)

            if st.button("Generate Audio (Not implemented yet)"):
                st.warning(
                    "Audio generation with ElevenLabs will be implemented in the next step."
                )
        else:
            st.error("Failed to generate script. Please try again.")


if __name__ == "__main__":
    main()
