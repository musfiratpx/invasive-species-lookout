"""
Run RAG once for every species on the map and save the results to
data/cache/insights/<species_id>.json, so the sidebar is instant at the demo
and doesn't depend on live AI calls or Wi-Fi.

Re-run this whenever the Researcher adds or edits a file in knowledge/.
Uses Snowflake / Gemini if they're set in .env, otherwise the local
keyword search + word-for-word (extractive) fallback.

Usage (from backend/):  python scripts/build_insights.py
"""

import json

import _setup  # noqa: F401  (adds backend/ to the import path)
import pandas as pd

from app import config
from app.rag.generator import get_generator
from app.rag.insights import SECTIONS, build_insights
from app.rag.retriever import get_retriever


def main():
    observations = pd.read_csv(config.OBSERVATIONS_CSV, dtype={"species_id": str})
    # The most common iNaturalist common name for each species, for the prompt
    species = (
        observations.fillna({"common_name": ""})
        .groupby(["species_id", "listed_name"])["common_name"]
        .agg(lambda names: names.mode().iloc[0] if not names.mode().empty else "")
        .reset_index()
    )

    retriever, generator = get_retriever(), get_generator()
    print(f"Building insights for {len(species)} species (retriever: {retriever.name}, generator: {generator.name})")
    config.INSIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    covered = 0
    for row in species.itertuples():
        insights = build_insights(
            {"scientific_name": row.listed_name, "common_name": row.common_name}, retriever, generator
        )
        (config.INSIGHTS_DIR / f"{row.species_id}.json").write_text(json.dumps(insights, indent=2))
        filled = [key for key in SECTIONS if (insights[key]["text"] if key == "handling" else insights[key])]
        covered += bool(filled)
        print(f"  {row.listed_name:32s} {', '.join(filled) or '(no fact sheet yet)'}")

    print(f"\n{covered} of {len(species)} species have at least one section from our sources.")
    print(f"Saved to {config.INSIGHTS_DIR.relative_to(config.BACKEND_DIR)}/")


if __name__ == "__main__":
    main()
