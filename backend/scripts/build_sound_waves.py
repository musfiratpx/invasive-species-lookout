"""
Draw-able waveforms for the real species recordings in data/cache/media.json, so the
sound player can show the shape of the actual sound (like a voice-memo app).
Saves data/cache/sound_waves.json: {species_id: {"peaks": [60 numbers from 0 to 1], "seconds": 12.3}}.

Why ahead of time: the browser isn't allowed to read iNaturalist's audio files
(no CORS header), so it can't measure them itself. The waveform is only a picture of
the real recording; nothing is generated or changed (CLAUDE.md rule 3).

Needs macOS's built-in `afconvert` to turn the .m4a files into plain WAV.

Usage (from backend/):  python scripts/build_sound_waves.py
"""

import array
import json
import math
import shutil
import subprocess
import tempfile
import time
import wave
from pathlib import Path

import _setup  # noqa: F401  (adds backend/ to the import path)
import requests

from app import config

BARS = 60  # how many bars the player draws
OUTPUT = config.CACHE_DIR / "sound_waves.json"


def peaks_of(wav_path):
    """Loudness (RMS) of BARS equal slices of a 16-bit mono WAV, scaled so the loudest is 1."""
    with wave.open(str(wav_path)) as w:
        rate, frames = w.getframerate(), w.readframes(w.getnframes())
    samples = array.array("h", frames)
    size = max(1, len(samples) // BARS)
    levels = []
    for i in range(BARS):
        chunk = samples[i * size:(i + 1) * size] or array.array("h", [0])
        levels.append(math.sqrt(sum(s * s for s in chunk) / len(chunk)))
    loudest = max(levels) or 1
    return [round(level / loudest, 3) for level in levels], round(len(samples) / rate, 1)


def main():
    if not shutil.which("afconvert"):
        raise SystemExit("This script needs macOS's afconvert (to read .m4a files).")
    media = json.loads(config.MEDIA_JSON.read_text())
    waves = {}
    with tempfile.TemporaryDirectory() as tmp:
        for species_id, entry in media.items():
            sound = entry.get("sound")
            if not sound or not sound.get("license"):
                continue  # "all rights reserved" sounds are only linked, not played
            time.sleep(1)  # polite to iNaturalist
            audio = Path(tmp) / f"{species_id}.m4a"
            audio.write_bytes(requests.get(sound["file_url"], timeout=60).content)
            wav = Path(tmp) / f"{species_id}.wav"
            # 16-bit, 8 kHz, mono: plenty for a 60-bar picture
            subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@8000", "-c", "1", str(audio), str(wav)], check=True)
            peaks, seconds = peaks_of(wav)
            waves[species_id] = {"peaks": peaks, "seconds": seconds}
            print(f"  {entry['scientific_name']:28s} {seconds:5.1f} s")
    OUTPUT.write_text(json.dumps(waves, indent=1))
    print(f"Saved {OUTPUT.relative_to(config.BACKEND_DIR)} ({len(waves)} recordings)")


if __name__ == "__main__":
    main()
