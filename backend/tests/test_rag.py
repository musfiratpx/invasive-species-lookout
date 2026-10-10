"""
Tests for the RAG pipeline (app/rag/), using a temporary EXAMPLE fact sheet.
The example text below is made up for testing and is NOT real species information.
No network or API keys are used.
"""

import json

import pytest

from app.rag.chunker import GENERAL, fact_sheet_reviews, load_chunks
from app import config
from app.rag import generator as generator_module
from app.rag.generator import CortexGenerator, ExtractiveGenerator
from app.rag.insights import build_insights
from app.rag.retriever import FallbackRetriever, KeywordRetriever

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
    # The only source is the general reporting page, not anything about this species
    assert insights["sources"] == [{"title": "Example reporting page (test only)", "url": "https://example.org/report"}]


def _fake_cortex(reply):
    """A CortexGenerator whose model always returns `reply`, so no Snowflake call is made."""
    generator = CortexGenerator()
    generator._ask_model = lambda system, user: reply
    return generator


def test_cortex_no_info_becomes_none(chunks):
    assert _fake_cortex("NO_INFO").generate("History", SPECIES, chunks)["text"] is None


def test_cortex_answer_includes_sources(chunks):
    answer = _fake_cortex("A short grounded answer.").generate("Summary", SPECIES, chunks)
    assert answer["text"] == "A short grounded answer."
    assert answer["sources"]


def test_cortex_is_not_called_without_chunks():
    def explode(system, user):
        raise AssertionError("the model must not be called with no sources")
    generator = _fake_cortex("unused")
    generator._ask_model = explode
    assert generator.generate("Summary", SPECIES, [])["text"] is None


def test_cortex_request_shape(chunks, monkeypatch):
    """Checks the SQL we send to Snowflake, using a stand-in connection instead of the network."""
    monkeypatch.setitem(config.SNOWFLAKE, "cortex_model", "test-model")
    sent = {}

    class FakeCursor:
        def execute(self, sql, params):
            sent.update(sql=sql, params=params)
            return self

        def fetchone(self):
            return ('{"choices": [{"messages": "Grounded text."}]}',)

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

    monkeypatch.setattr(generator_module.snowflake_api, "connect", lambda: FakeConnection())
    answer = CortexGenerator().generate("Summary", SPECIES, chunks)

    assert answer["text"] == "Grounded text."
    assert "snowflake.cortex.complete" in sent["sql"]
    model, messages, options = sent["params"]
    assert model == "test-model"
    messages = json.loads(messages)
    assert [m["role"] for m in messages] == ["system", "user"]
    assert "EXAMPLE TEXT" in messages[1]["content"]  # the chunks are in the prompt
    assert json.loads(options)["temperature"] == 0


def test_report_combines_species_note_and_general_instructions(tmp_path):
    sheet = EXAMPLE_SHEET + "\n## How to report it\nEXAMPLE TEXT: species-specific reporting note.\n"
    (tmp_path / "celastrus-orbiculatus.md").write_text(sheet)
    (tmp_path / "how-to-report.md").write_text(EXAMPLE_GENERAL)
    insights = build_insights(SPECIES, KeywordRetriever(load_chunks(tmp_path)), ExtractiveGenerator())
    first, second = insights["report"].split("\n\n")
    assert "species-specific" in first and "report sightings" in second
    assert {"title": "Example reporting page (test only)", "url": "https://example.org/report"} in insights["sources"]


def test_report_for_species_without_sheet_uses_general_file(chunks):
    insights = build_insights({"scientific_name": "Rosa multiflora", "common_name": "multiflora rose"},
                              KeywordRetriever(chunks), ExtractiveGenerator())
    assert insights["report"] == "EXAMPLE TEXT: report sightings for testing."
    assert insights["summary"] is None  # still no species facts without a sheet


def test_report_and_handling_are_never_ai_written(chunks):
    insights = build_insights(SPECIES, KeywordRetriever(chunks), _fake_cortex("AI WROTE THIS"))
    assert insights["summary"] == "AI WROTE THIS"
    assert insights["found_by"]["summary"]["word_for_word"] is False  # the UI then says it was reworded
    assert insights["found_by"]["handling"]["word_for_word"] is True
    assert insights["report"] == "EXAMPLE TEXT: report sightings for testing."
    assert insights["handling"]["text"] == "EXAMPLE TEXT: pull it up for testing."  # safety text, word for word


def test_html_comments_are_dropped(tmp_path):
    (tmp_path / "x.md").write_text(EXAMPLE_SHEET.replace("## History\n", "## History\n<!-- a hint, not content -->\n"))
    assert all(c.section != "History" for c in load_chunks(tmp_path))


def test_broken_header_is_skipped_not_fatal(tmp_path, capsys):
    (tmp_path / "good.md").write_text(EXAMPLE_SHEET)
    (tmp_path / "bad.md").write_text('---\nsources:\n  - title: "a "quoted" word"\n---\n## Summary\ntext\n')
    chunks = load_chunks(tmp_path)
    assert any(c.file == "good.md" for c in chunks)
    assert all(c.file != "bad.md" for c in chunks)
    assert "SKIPPED bad.md" in capsys.readouterr().out


def test_found_by_names_the_search_and_the_file(chunks):
    insights = build_insights(SPECIES, KeywordRetriever(chunks), ExtractiveGenerator())
    assert insights["found_by"]["summary"] == {"retriever": "keyword", "files": ["celastrus-orbiculatus.md"],
                                               "section": "Summary", "word_for_word": True}
    assert insights["found_by"]["history"] is None  # empty section: nothing was found, so nothing is claimed
    assert insights["found_by"]["report"]["files"] == ["how-to-report.md"]


def test_fallback_reports_which_search_really_answered(chunks):
    class Broken:
        name = "snowflake"

        def retrieve(self, *args):
            raise ConnectionError("no wifi")

    retriever = FallbackRetriever(Broken(), KeywordRetriever(chunks))
    insights = build_insights(SPECIES, retriever, ExtractiveGenerator())
    assert insights["found_by"]["summary"]["retriever"] == "keyword"  # never claims Snowflake when it fell back


def test_review_status_comes_from_the_header(tmp_path):
    (tmp_path / "draft.md").write_text(EXAMPLE_SHEET.replace("touch_safe: true", "touch_safe: true\nreviewed_by:"))
    (tmp_path / "checked.md").write_text(EXAMPLE_SHEET.replace("touch_safe: true", "touch_safe: true\nreviewed_by: Example Reviewer"))
    (tmp_path / "_TEMPLATE.md").write_text(EXAMPLE_SHEET)
    assert fact_sheet_reviews(tmp_path) == {"checked.md": "Example Reviewer", "draft.md": None}
