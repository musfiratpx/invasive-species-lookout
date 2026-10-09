"""
Build the sidebar's text sections for one species: summary, history, seasons, handling.

For each section we retrieve chunks, then generate from ONLY those chunks.
touch_safe never comes from AI: it is copied from the fact sheet header, which
the Researcher fills in only when a source explicitly says so.
"""

from datetime import datetime, timezone

from app.rag.generator import get_generator
from app.rag.retriever import get_retriever

# API field -> fact-sheet heading (the headings in knowledge/_TEMPLATE.md)
SECTIONS = {
    "summary": "Summary",
    "history": "History",
    "seasons": "Seasonal differences",
    "handling": "How to handle it",
}


def build_insights(species, retriever=None, generator=None):
    """
    species: {"scientific_name": <name on the NY list>, "common_name": ...}
    Returns the 'insights' object described in docs/API.md (plus a few metadata fields).
    """
    retriever = retriever or get_retriever()
    generator = generator or get_generator()
    name = species["scientific_name"]

    result, all_sources, touch_safe = {}, [], None
    for key, heading in SECTIONS.items():
        query = f"{heading} {species.get('common_name', '')} {name}"
        chunks = retriever.retrieve(query, scientific_name=name, k=4)
        answer = generator.generate(heading, species, chunks)
        result[key] = answer["text"]
        for source in answer["sources"]:
            if source not in all_sources:
                all_sources.append(source)
        if key == "handling" and answer["text"]:
            # Only trust touch_safe from this species' own fact sheet.
            flags = [c.touch_safe for c in chunks if c.scientific_name == name and c.touch_safe is not None]
            touch_safe = flags[0] if flags else None

    return {
        "summary": result["summary"],
        "history": result["history"],
        "seasons": result["seasons"],
        "handling": {"text": result["handling"], "touch_safe": touch_safe},
        "sources": all_sources,
        "generated_with": {"retriever": retriever.name, "generator": generator.name},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
