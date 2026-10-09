"""
Turn retrieved chunks into a short answer for one sidebar section.

Interface:  generate(section, species, chunks) -> {"text": str | None, "sources": [{title, url}]}

  - GeminiGenerator: rewrites the chunks as 2-4 plain-English sentences
    (used when GEMINI_API_KEY and GEMINI_MODEL are set).
  - ExtractiveGenerator: no AI. Returns the matching fact-sheet section as written.

Ground rule: answers come ONLY from the chunks. If they don't cover the
section, text is None and the UI says "No information in our sources yet".
"""

from app import config

NO_INFO = "NO_INFO"

SYSTEM_PROMPT = f"""You write short texts for a public map of invasive species in Queens, New York.
Rules:
- Use ONLY the numbered source excerpts you are given. Do not add any fact from your own knowledge.
- Write 2 to 4 plain-English sentences for a general audience. No lists, no headings, no citations in the text.
- If the excerpts do not answer the request, reply with exactly {NO_INFO} and nothing else.
- Never say whether the species is safe to touch unless an excerpt says so explicitly."""


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


class GeminiGenerator:
    """Uses Google Gemini through the google-genai SDK, grounded on the given chunks only."""

    name = "gemini"

    def __init__(self):
        from google import genai  # imported here so the app runs even if the package is missing

        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.model = config.GEMINI_MODEL

    def _prompt(self, section, species, chunks):
        excerpts = "\n\n".join(
            f"[{i}] (from {c.file}, section \"{c.section}\")\n{c.text}" for i, c in enumerate(chunks, start=1)
        )
        return (
            f"Species: {species['common_name']} ({species['scientific_name']})\n"
            f"Write the \"{section}\" section about this species.\n\n"
            f"Source excerpts:\n{excerpts}"
        )

    def generate(self, section, species, chunks):
        if not chunks:
            return _empty()  # nothing retrieved: don't even ask the model
        from google.genai import types

        response = self.client.models.generate_content(
            model=self.model,
            contents=self._prompt(section, species, chunks),
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT, temperature=0.2),
        )
        text = (response.text or "").strip()
        if not text or NO_INFO in text:
            return _empty()
        return {"text": text, "sources": _sources(chunks)}


class FallbackGenerator:
    """Try Gemini; if it errors, use the extractive generator so a section is never lost to a network problem."""

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
    if config.gemini_enabled():
        return FallbackGenerator(GeminiGenerator(), ExtractiveGenerator())
    return ExtractiveGenerator()
