"""
Turn retrieved chunks into a short answer for one sidebar section.

Interface:  generate(section, species, chunks) -> {"text": str | None, "sources": [{title, url}]}

  - CortexGenerator: Snowflake Cortex COMPLETE rewrites the chunks as 2-4 plain-English
    sentences (used when the Snowflake settings AND SNOWFLAKE_CORTEX_MODEL are set).
  - ExtractiveGenerator: no AI. Returns the matching fact-sheet section as written.

Ground rule: answers come ONLY from the chunks. If they don't cover the
section, text is None and the UI says "No information in our sources yet".
"""

import json

from app import config, snowflake_api

NO_INFO = "NO_INFO"

SYSTEM_PROMPT = f"""You write short texts for a public map of invasive species in New York City.
Rules:
- Use ONLY the numbered source excerpts you are given. Do not add any fact from your own knowledge.
- Write 2 to 4 plain-English sentences for a general audience. No lists, no headings, no citations in the text.
- The excerpts come from the matching section of our fact sheet. Rewrite what they say; do not judge whether the section title fits.
- If the excerpts contain no information about this species, reply with exactly {NO_INFO} and nothing else.
- Never say whether the species is safe to touch unless an excerpt says so explicitly.
- Do not add any number, date, time period (such as "per year"), organization, place or reason that is not in the excerpts.
- Keep every rule, warning and permission exactly as the excerpts state it. Never merge two separate rules into one sentence or change who or what a rule applies to."""


def _sources(chunks):
    """Unique {title, url} entries from the chunks, in order."""
    seen, result = set(), []
    for chunk in chunks:
        for source in chunk.sources:
            if source["url"] not in seen:
                seen.add(source["url"])
                result.append({"title": source["title"], "url": source["url"]})
    return result


def _empty():
    return {"text": None, "sources": []}


class ExtractiveGenerator:
    """Returns the species' own fact-sheet section word for word. No AI involved."""

    name = "extractive"

    def generate(self, section, species, chunks):
        for chunk in chunks:
            if chunk.section.lower() == section.lower() and chunk.scientific_name == species["scientific_name"]:
                return {"text": chunk.text, "sources": _sources([chunk])}
        return _empty()


class CortexGenerator:
    """
    Writes the text with a Snowflake Cortex model, grounded on the given chunks only.
    Calls SNOWFLAKE.CORTEX.COMPLETE through SQL. (We tried Cortex's REST chat endpoint
    first, but our trial account gets a 403 there, while COMPLETE through SQL works.)
    Docs: https://docs.snowflake.com/en/sql-reference/functions/complete-snowflake-cortex
    """

    name = "cortex"

    def __init__(self):
        self.model = config.SNOWFLAKE["cortex_model"]

    def _prompt(self, section, species, chunks):
        excerpts = "\n\n".join(
            f"[{i}] (from {c.file}, section \"{c.section}\")\n{c.text}" for i, c in enumerate(chunks, start=1)
        )
        return (
            f"Species: {species['common_name']} ({species['scientific_name']})\n"
            f"Rewrite the \"{section}\" section of our fact sheet about this species for the public.\n\n"
            f"Source excerpts:\n{excerpts}"
        )

    def _ask_model(self, system, user):
        """One COMPLETE call; returns the model's reply text. Separate so tests can replace it."""
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        options = {"temperature": 0, "max_tokens": 300}  # temperature 0 = stick as closely as possible to the excerpts
        row = snowflake_api.connect().cursor().execute(
            "select snowflake.cortex.complete(%s, parse_json(%s), parse_json(%s))",
            (self.model, json.dumps(messages), json.dumps(options)),
        ).fetchone()
        # COMPLETE returns JSON text like {"choices": [{"messages": "the answer"}], ...}
        return json.loads(row[0])["choices"][0]["messages"] or ""

    def generate(self, section, species, chunks):
        if not chunks:
            return _empty()  # nothing retrieved: don't even ask the model
        text = self._ask_model(SYSTEM_PROMPT, self._prompt(section, species, chunks)).strip()
        if not text or NO_INFO in text:
            return _empty()
        return {"text": text, "sources": _sources(chunks)}


class FallbackGenerator:
    """Try Cortex; if it errors, use the extractive generator so a section is never lost to a network problem."""

    def __init__(self, main, backup):
        self.main, self.backup = main, backup
        self.name = main.name

    def generate(self, section, species, chunks):
        try:
            return self.main.generate(section, species, chunks)
        except Exception as error:  # noqa: BLE001
            print(f"[generator] {self.main.name} failed ({type(error).__name__}); using extractive")
            return self.backup.generate(section, species, chunks)


def get_generator():
    if config.cortex_generation_enabled():
        return FallbackGenerator(CortexGenerator(), ExtractiveGenerator())
    return ExtractiveGenerator()
