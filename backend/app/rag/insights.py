"""
Build the sidebar's text sections for one species: summary, history, seasons,
handling and report.

For each section we retrieve chunks, then generate from ONLY those chunks.
touch_safe never comes from AI: it is copied from the fact sheet header, which
the Researcher fills in only when a source explicitly says so.
"How to report it" is never rewritten by AI either: reporting steps must be exact,
so we show the source text word for word.
"""

from datetime import datetime, timezone

from app.rag.chunker import GENERAL
from app.rag.generator import get_generator
from app.rag.retriever import get_retriever

# API field -> fact-sheet heading (the headings in knowledge/_TEMPLATE.md)
SECTIONS = {
    "summary": "Summary",
    "history": "History",
    "seasons": "Seasonal differences",
    "handling": "How to handle it",
}
REPORT_HEADING = "How to report it"


def _report(retriever, name):
    """
    The species' own reporting note (if its fact sheet has one), followed by the
    general reporting instructions from knowledge/how-to-report.md. Word for word.
    """
    chunks = retriever.retrieve(f"{REPORT_HEADING} report sighting", scientific_name=name, k=5)
    own = [c for c in chunks if c.section == REPORT_HEADING and c.scientific_name == name][:1]
    general = [c for c in chunks if c.section == REPORT_HEADING and c.scientific_name == GENERAL][:1]
    picked = own + general
    if not picked:
        return None, []
    sources = [s for c in picked for s in c.sources]
    return "\n\n".join(c.text for c in picked), sources


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

    report_text, report_sources = _report(retriever, name)
    for source in report_sources:
        if source not in all_sources:
            all_sources.append(source)

    return {
        "summary": result["summary"],
        "history": result["history"],
        "seasons": result["seasons"],
        "handling": {"text": result["handling"], "touch_safe": touch_safe},
        "report": report_text,
        "sources": all_sources,
        "generated_with": {"retriever": retriever.name, "generator": generator.name},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
