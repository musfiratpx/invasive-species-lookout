"""
Tests for the RAG pipeline (app/rag/), using a temporary EXAMPLE fact sheet.
The example text below is made up for testing and is NOT real species information.
No network or API keys are used.
"""

from types import SimpleNamespace

import pytest

from app.rag.chunker import GENERAL, load_chunks
from app.rag.generator import ExtractiveGenerator, GeminiGenerator
from app.rag.insights import build_insights
from app.rag.retriever import KeywordRetriever

EXAMPLE_SHEET = """---
scientific_name: Celastrus orbiculatus
touch_safe: true
sources:
  - title: Example source (test only)
    url: https://example.org/test-source
---

## Summary
EXAMPLE TEXT: a climbing vine used only for testing.

## History

## How to handle it
EXAMPLE TEXT: pull it up for testing.
"""

EXAMPLE_GENERAL = """---
sources:
  - title: Example reporting page (test only)
    url: https://example.org/report
---

## How to report it
EXAMPLE TEXT: report sightings for testing.
"""

SPECIES = {"scientific_name": "Celastrus orbiculatus", "common_name": "Oriental bittersweet"}


@pytest.fixture
def chunks(tmp_path):
    (tmp_path / "celastrus-orbiculatus.md").write_text(EXAMPLE_SHEET)
    (tmp_path / "how-to-report.md").write_text(EXAMPLE_GENERAL)
    (tmp_path / "_TEMPLATE.md").write_text(EXAMPLE_SHEET.replace("Celastrus orbiculatus", "Genus species"))
    return load_chunks(tmp_path)


def test_chunker_splits_sections_and_skips_empty_ones(chunks):
    sections = {(c.scientific_name, c.section) for c in chunks}
    assert ("Celastrus orbiculatus", "Summary") in sections
    assert ("Celastrus orbiculatus", "History") not in sections  # empty in the sheet
    assert (GENERAL, "How to report it") in sections
    assert all(c.file != "_TEMPLATE.md" for c in chunks)


def test_chunker_keeps_sources(chunks):
    summary = next(c for c in chunks if c.section == "Summary")
    assert summary.sources == [{"title": "Example source (test only)", "url": "https://example.org/test-source"}]


def test_keyword_retriever_filters_by_species(chunks):
    retriever = KeywordRetriever(chunks)
    found = retriever.retrieve("Summary", scientific_name="Celastrus orbiculatus")
    assert found[0].section == "Summary"
    assert retriever.retrieve("Summary", scientific_name="Rosa multiflora") == []


def test_extractive_returns_section_with_sources(chunks):
    answer = ExtractiveGenerator().generate("Summary", SPECIES, chunks)
    assert answer["text"].startswith("EXAMPLE TEXT")
    assert answer["sources"][0]["url"] == "https://example.org/test-source"


def test_missing_section_gives_no_text(chunks):
    insights = build_insights(SPECIES, KeywordRetriever(chunks), ExtractiveGenerator())
    assert insights["summary"].startswith("EXAMPLE TEXT")
    assert insights["history"] is None  # empty in the sheet -> "No information in our sources yet"
    assert insights["seasons"] is None
    assert insights["handling"]["touch_safe"] is True  # copied from the sheet header, not AI
    assert {"title": "Example source (test only)", "url": "https://example.org/test-source"} in insights["sources"]


def test_species_without_sheet_gets_nothing(chunks):
    insights = build_insights({"scientific_name": "Rosa multiflora", "common_name": "multiflora rose"},
                              KeywordRetriever(chunks), ExtractiveGenerator())
    assert insights["summary"] is None
    assert insights["handling"]["text"] is None
    assert insights["handling"]["touch_safe"] is None
    assert insights["sources"] == []


def _fake_gemini(reply):
    """A GeminiGenerator whose 'model' always returns `reply`, so no API call is made."""
    generator = GeminiGenerator.__new__(GeminiGenerator)
    generator.model = "test-model"
    generator.client = SimpleNamespace(models=SimpleNamespace(
        generate_content=lambda **kwargs: SimpleNamespace(text=reply)))
    return generator


def test_gemini_no_info_becomes_none(chunks):
    assert _fake_gemini("NO_INFO").generate("History", SPECIES, chunks)["text"] is None


def test_gemini_answer_includes_sources(chunks):
    answer = _fake_gemini("A short grounded answer.").generate("Summary", SPECIES, chunks)
    assert answer["text"] == "A short grounded answer."
    assert answer["sources"]


def test_gemini_is_not_called_without_chunks():
    def explode(**kwargs):
        raise AssertionError("the model must not be called with no sources")
    generator = _fake_gemini("unused")
    generator.client.models.generate_content = explode
    assert generator.generate("Summary", SPECIES, [])["text"] is None
