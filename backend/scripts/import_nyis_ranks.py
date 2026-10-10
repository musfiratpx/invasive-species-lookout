"""
Download every New York Non-Native Plant Invasiveness Ranking Form from nyis.info
and save each species' official rank and score to data/sources/nyis_plant_ranks.csv.

Why a script: the forms are ~180 separate PDFs with no master table, so we read
them ourselves. Running this again re-creates the CSV from the official PDFs,
which lets anyone check where a danger level came from.

The score is recomputed with the form's own formula, 100 * a / b, from the
"Outcome score" row, because the printed number is sometimes split across lines
by the PDF layout. The rank is copied exactly as written on the form.

Usage (from backend/):  python scripts/import_nyis_ranks.py
Needs: pip install pypdf requests
"""

import csv
import logging
import re
import time
from pathlib import Path

import pypdf
import requests

BACKEND = Path(__file__).resolve().parent.parent
PDF_DIR = BACKEND / "data" / "cache" / "nyis_forms"  # gitignored download cache
OUT_CSV = BACKEND / "data" / "sources" / "nyis_plant_ranks.csv"

# nyis.info runs WordPress; its public media API lists every uploaded form.
MEDIA_API = "https://nyis.info/wp-json/wp/v2/media"
# pypdf prints noisy font warnings for these older PDFs; the text still extracts fine.
logging.getLogger("pypdf").setLevel(logging.ERROR)

HEADERS = {"User-Agent": "InvasiveSpeciesLookout/0.1 (HackKnight 2026 student project)"}


def list_form_urls():
    """Return the URLs of all state ranking forms (files ending in NYS.pdf)."""
    urls, page = set(), 1
    while True:
        resp = requests.get(
            MEDIA_API,
            params={"search": "NYS", "per_page": 100, "page": page, "_fields": "source_url"},
            headers=HEADERS,
            timeout=30,
        )
        if resp.status_code == 400:  # WordPress returns 400 past the last page
            break
        resp.raise_for_status()
        for item in resp.json():
            url = item["source_url"]
            if re.search(r"NYS\d?_?\.pdf$", url, re.I):
                urls.add(url)
        if page >= int(resp.headers.get("X-WP-TotalPages", 1)):
            break
        page += 1
        time.sleep(1)  # be polite
    return sorted(urls)


def download(url):
    """Download one form unless we already have it."""
    path = PDF_DIR / Path(url).name
    if not path.exists() or path.stat().st_size == 0:
        resp = requests.get(url, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        path.write_bytes(resp.content)
        time.sleep(1)  # be polite
    return path


def grab(pattern, text):
    match = re.search(pattern, text, re.I | re.S)
    return match.group(1).strip() if match else ""


def read_form(path):
    """Pull the fields we need from the first two pages of a form."""
    pages = pypdf.PdfReader(path).pages[:2]
    text = re.sub(r"[ \t]+", " ", "\n".join(p.extract_text() or "" for p in pages))

    outcome = re.search(r"Outcome\s*score\s*\d+\s*\(\s*([\d.]+)\s*\)\s*b\s*([\d.]+)\s*a", text)
    score = f"{100 * float(outcome.group(2)) / float(outcome.group(1)):.2f}" if outcome else ""

    rank_line = grab(r"New York Invasiveness Rank\s*§?\s*:?\s*([^\n]*)", text)
    return {
        "file": path.name,
        "scientific_name": grab(r"Scientific name:\s*(.+?)\s*(?:USDA|\n)", text),
        "common_name": grab(r"Common names?:\s*(.+?)\s*\n", text),
        "rank": grab(r"New York Invasiveness Rank:\s*([A-Za-z ]+?)\s*\(", text),
        "rank_line": rank_line,
        "score": score,
        "date_assessed": grab(r"Date assessed:\s*(.+?)\s*\n", text),
    }


def main():
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    urls = list_form_urls()
    print(f"Found {len(urls)} ranking forms on nyis.info")

    rows = []
    for url in urls:
        row = read_form(download(url))
        row["url"] = url
        rows.append(row)

    fields = ["file", "scientific_name", "common_name", "rank", "rank_line", "score", "date_assessed", "url"]
    with OUT_CSV.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUT_CSV.relative_to(BACKEND)}")


if __name__ == "__main__":
    main()
