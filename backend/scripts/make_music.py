"""

Saves:
  frontend/public/audio/background.mp3        the music file
  frontend/public/audio/background.credit.json the prompt and settings used, for credits

API docs (checked 2026-10-09): https://elevenlabs.io/docs/api-reference/music/compose
  POST https://api.elevenlabs.io/v1/music, key in the "xi-api-key" header,
  JSON body {prompt, music_length_ms, force_instrumental, model_id}, audio file returned.

Usage (from backend/):
  python scripts/make_music.py --dry-run   # show what would be sent, without calling the API
  python scripts/make_music.py             # generate (needs ELEVENLABS_API_KEY in backend/.env)
  python scripts/make_music.py --force     # replace an existing background.mp3
"""

import json
import sys
from datetime import date

import _setup  # noqa: F401  (adds backend/ to the import path)
import requests

from app import config


API_URL = "https://api.elevenlabs.io/v1/music"
OUTPUT_FORMAT = "mp3_44100_128"

PROMPT = "light classical nature-like background music, no vocals, loopable, 60 seconds"
SETTINGS = {
    "prompt": PROMPT,
    "music_length_ms": 60_000,
    "force_instrumental": True, 
    "model_id": "music_v1",   
}

AUDIO_DIR = config.BACKEND_DIR.parent / "frontend" / "public" / "audio"
MUSIC_FILE = AUDIO_DIR / "background.mp3"
CREDIT_FILE = AUDIO_DIR / "background.credit.json"


def main():
    print("Prompt used (for the credits):")
    print(f'  "{PROMPT}"')
    print(f"Settings: {json.dumps({k: v for k, v in SETTINGS.items() if k != 'prompt'})}")

    if "--dry-run" in sys.argv:
        print(f"\nDry run: would POST to {API_URL}?output_format={OUTPUT_FORMAT} and save {MUSIC_FILE}")
        return

    if MUSIC_FILE.exists() and "--force" not in sys.argv:
        print(f"\n{MUSIC_FILE.name} already exists. Use --force to replace it (this uses ElevenLabs credits).")
        return

    if not config.ELEVENLABS_API_KEY:
        print("\nELEVENLABS_API_KEY is empty in backend/.env, so no music was generated.")
        print("The app works without it: the music button just says 'Music not available'.")
        return

    print("\nGenerating music (this can take a minute)...")
    response = requests.post(
        API_URL,
        params={"output_format": OUTPUT_FORMAT},
        headers={"xi-api-key": config.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        json=SETTINGS,
        timeout=300,
    )
    if response.status_code != 200:
        print(f"ElevenLabs returned {response.status_code}: {response.text[:500]}")
        sys.exit(1)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    MUSIC_FILE.write_bytes(response.content)
    CREDIT_FILE.write_text(json.dumps({
        "generated_with": "ElevenLabs Music API",
        "generated_on": date.today().isoformat(),
        "output_format": OUTPUT_FORMAT,
        **SETTINGS,
    }, indent=2))
    print(f"Saved {MUSIC_FILE} ({len(response.content) // 1024} KB) and {CREDIT_FILE.name}")


if __name__ == "__main__":
    main()
