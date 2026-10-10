"""
Run RAG once for every species on the map and save the results to
data/cache/insights/<species_id>.json, so the sidebar is instant at the demo
and doesn't depend on live AI calls or Wi-Fi.

Re-run this whenever the Researcher adds or edits a file in knowledge/.
Uses Snowflake (Cortex Search + Cortex chat) if it's set in .env, otherwise the
local keyword search + word-for-word (extractive) fallback.

Usage (from backend/):  python scripts/build_insights.py

To fill in only the word-for-word "Look-alikes" section, without re-running AI on the
other sections (so reviewed text in the cache stays as it is):
    python scripts/build_insights.py --only-lookalikes

To build only species that have no cache file yet (e.g. new species after widening the
map area), leaving every existing file alone. It searches the local fact sheets, so new
sheets work before they're uploaded to Snowflake:
    python scripts/build_insights.py --only-missing
"""

import json
import sys

import _setup  # noqa: F401  (adds backend/ to the import path)
import pandas as pd

from app import config
from app.rag.chunker import load_chunks
from app.rag.generator import get_generator
from app.rag.insights import SECTIONS, build_insights
from app.rag.retriever import KeywordRetriever, get_retriever


def update_lookalikes_only():
    """
    Add each species' "Look-alikes" section to its existing cache file, leaving every other
    section alone. Reads the local fact sheets directly (no Snowflake, no AI): this section
    is shown word for word anyway.
    """
    sheets = {c.scientific_name: c for c in load_chunks() if c.section == SECTIONS["lookalikes"]}
    observations = pd.read_csv(config.OBSERVATIONS_CSV, dtype={"species_id": str})
    filled = 0
    for row in observations[["species_id", "listed_name"]].drop_duplicates("species_id").itertuples():
        path = config.INSIGHTS_DIR / f"{row.species_id}.json"
        if not path.exists():
            continue
        insights = json.loads(path.read_text())
        chunk = sheets.get(row.listed_name)
        insights["lookalikes"] = chunk.text if chunk else None
        for source in chunk.sources if chunk else []:
            if source not in insights.setdefault("sources", []):
                insights["sources"].append(source)
        path.write_text(json.dumps(insights, indent=2))
        filled += bool(chunk)
        if chunk:
            print(f"  {row.listed_name}")
    print(f"\n{filled} species have a Look-alikes section.")


def main(only_missing=False):
    observations = pd.read_csv(config.OBSERVATIONS_CSV, dtype={"species_id": str})
    # The most common iNaturalist common name for each species, for the prompt
    species = (
        observations.fillna({"common_name": ""})
        .groupby(["species_id", "listed_name"])["common_name"]
        .agg(lambda names: names.mode().iloc[0] if not names.mode().empty else "")
        .reset_index()
    )

    if only_missing:
        species = species[[not (config.INSIGHTS_DIR / f"{sid}.json").exists() for sid in species["species_id"]]]
    retriever = KeywordRetriever() if only_missing else get_retriever()
    generator = get_generator()
    print(f"Building insights for {len(species)} species (retriever: {retriever.name}, generator: {generator.name})")
    config.INSIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    covered = 0
    for row in species.itertuples():
        insights = build_insights(
            {"scientific_name": row.listed_name, "common_name": row.common_name}, retriever, generator
        )
        (config.INSIGHTS_DIR / f"{row.species_id}.json").write_text(json.dumps(insights, indent=2))
        filled = [key for key in SECTIONS if (insights[key]["text"] if key == "handling" else insights[key])]
        if insights["report"]:
            filled.append("report")
        covered += bool(set(filled) - {"report"})  # "report" alone comes from the general file
        print(f"  {row.listed_name:32s} {', '.join(filled) or '(no fact sheet yet)'}")

    print(f"\n{covered} of {len(species)} species have their own fact sheet; all get the general reporting text if how-to-report.md exists.")
    print(f"Saved to {config.INSIGHTS_DIR.relative_to(config.BACKEND_DIR)}/")


if __name__ == "__main__":
    if "--only-lookalikes" in sys.argv:
        update_lookalikes_only()
    else:
        main(only_missing="--only-missing" in sys.argv)
