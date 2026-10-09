#!/usr/bin/env python3
"""Render an original procedural trailer cue. Requires Python 3 and ffmpeg.

No recordings or third-party samples are used. Source uses the repository's
MIT license; the generated cue is dedicated to the public domain under CC0
(see examples/demo/music-CC0.txt). Output is deterministic and stripped of metadata.
"""
import array
import math
from pathlib import Path
import subprocess
import tempfile
import wave

RATE = 44100
DURATION = 24
ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parent / 'music.mp3'


def render():
    notes = (110, 130.81278265, 164.81377846, 146.83238396)
    samples = array.array('h')
    for i in range(RATE * DURATION):
        t = i / RATE
        section = int(t // 6)
        root = notes[section % len(notes)]
        pulse = t % 0.75
        beat = t % 1.5
        bass = 0.23 * math.sin(2 * math.pi * root * t) * math.exp(-pulse * 7)
        pad = sum(math.sin(2 * math.pi * root * ratio * t) for ratio in (1, 1.5, 2)) * 0.045
        kick = 0.25 * math.sin(2 * math.pi * (42 * beat + 9 * (1 - math.exp(-beat * 18)))) * math.exp(-beat * 14)
        shimmer = 0.025 * math.sin(2 * math.pi * root * 8 * t) * math.exp(-pulse * 14)
        fade = min(1, t / 2, (DURATION - t) / 3)
        samples.append(round(max(-1, min(1, bass + pad + kick + shimmer)) * fade * 32767))
    with tempfile.TemporaryDirectory() as directory:
        raw = Path(directory) / 'cue.wav'
        with wave.open(str(raw), 'wb') as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(RATE)
            if __import__('sys').byteorder != 'little':
                samples.byteswap()
            output.writeframes(samples.tobytes())
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(raw), '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', '128k', '-write_xing', '0', '-id3v2_version', '0', str(OUTPUT)], check=True)
    print(f'Rendered {OUTPUT.relative_to(ROOT)} ({DURATION}s)')


if __name__ == '__main__':
    render()
