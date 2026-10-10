"""
Find the fact-sheet chunks that best answer a question.

Interface:  retrieve(query, scientific_name=None, k=5, section=None) -> list[Chunk]

  - SnowflakeRetriever: asks a Snowflake Cortex Search service (used when the
    Snowflake settings in .env are filled in).
  - KeywordRetriever: simple word matching on the local files. Needs nothing
    external, so it always works, including offline at the demo.

get_retriever() picks Snowflake when configured and falls back to keywords if
a Snowflake call fails, so the app never breaks because of a network problem.
"""

import json
import re

import requests

from app import config, snowflake_api
from app.rag.chunker import GENERAL, Chunk, load_chunks

STOP_WORDS = {"the", "a", "an", "of", "and", "or", "to", "in", "is", "it", "how", "what", "does", "for", "on"}


def _words(text):
    return {w for w in re.findall(r"[a-z]+", text.lower()) if w not in STOP_WORDS}


class KeywordRetriever:
    """Scores each chunk by how many query words appear in its section name and text."""

    name = "keyword"

    def __init__(self, chunks=None):
        self.chunks = chunks if chunks is not None else load_chunks()

    def retrieve(self, query, scientific_name=None, k=5, section=None):
        query_words = _words(query)
        scored = []
        for chunk in self.chunks:
            # Only this species' fact sheet, plus general files (e.g. how to report).
            if scientific_name and chunk.scientific_name not in (scientific_name, GENERAL):
                continue
            if section and chunk.section != section:
                continue
            # A match in the section heading counts much more than one in the body.
            score = 3 * len(query_words & _words(chunk.section)) + len(query_words & _words(chunk.text))
            if scientific_name and chunk.scientific_name == scientific_name:
                score += 1  # prefer the species' own sheet over general files
            if score > 0:
                scored.append((score, chunk))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [chunk for _, chunk in scored[:k]]


class SnowflakeRetriever:
    """
    Queries a Cortex Search service over REST, authenticated with a programmatic access token.
    Docs: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-search/query-cortex-search-service
    The table and service are created by backend/snowflake/setup.sql.
    """

    name = "snowflake"
    COLUMNS = ["CHUNK_ID", "TEXT", "SCIENTIFIC_NAME", "SECTION", "SOURCES", "FILE", "TOUCH_SAFE"]

    def __init__(self):
        sf = config.SNOWFLAKE
        self.url = (
            f"{snowflake_api.base_url()}/api/v2/databases/{sf['database']}"
            f"/schemas/{sf['schema']}/cortex-search-services/{sf['search_service']}:query"
        )
        self.headers = snowflake_api.headers()

    def retrieve(self, query, scientific_name=None, k=5, section=None):
        body = {"query": query, "columns": self.COLUMNS, "limit": k}
        filters = []
        if scientific_name:
            filters.append({"@or": [
                {"@eq": {"SCIENTIFIC_NAME": scientific_name}},
                {"@eq": {"SCIENTIFIC_NAME": GENERAL}},
            ]})
        if section:
            filters.append({"@eq": {"SECTION": section}})  # SECTION is an ATTRIBUTE in setup.sql
        if filters:
            body["filter"] = filters[0] if len(filters) == 1 else {"@and": filters}
        response = requests.post(self.url, headers=self.headers, json=body, timeout=20)
        response.raise_for_status()
        return [self._to_chunk(row) for row in response.json().get("results", [])]

    @staticmethod
    def _to_chunk(row):
        row = {key.upper(): value for key, value in row.items()}  # column-name case can vary
        touch_safe = row.get("TOUCH_SAFE")
        return Chunk(
            chunk_id=row.get("CHUNK_ID", ""),
            text=row.get("TEXT", ""),
            scientific_name=row.get("SCIENTIFIC_NAME", GENERAL),
            section=row.get("SECTION", ""),
            sources=json.loads(row.get("SOURCES") or "[]"),
            file=row.get("FILE", ""),
            touch_safe={"true": True, "false": False}.get(str(touch_safe).lower()),
        )


class FallbackRetriever:
    """Try the main retriever; if it errors (no Wi-Fi, bad key...), use the keyword one instead."""

    def __init__(self, main, backup):
        self.main, self.backup = main, backup
        self.name = main.name

    def retrieve(self, query, scientific_name=None, k=5, section=None):
        try:
            return self.main.retrieve(query, scientific_name, k, section)
        except Exception as error:  # noqa: BLE001  (any failure should fall back, not crash)
            print(f"[retriever] {self.main.name} failed ({type(error).__name__}); using keyword search")
            return self.backup.retrieve(query, scientific_name, k, section)


def get_retriever():
    """Snowflake if configured (with keyword fallback), otherwise keyword."""
    if config.snowflake_enabled():
        return FallbackRetriever(SnowflakeRetriever(), KeywordRetriever())
    return KeywordRetriever()
