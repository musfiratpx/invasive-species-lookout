"""
Upload the fact-sheet chunks from knowledge/ into Snowflake's KNOWLEDGE_CHUNKS table.
The Cortex Search service (see snowflake/setup.sql) picks up the changes
within its TARGET_LAG.

Run setup.sql once first. Then run this whenever knowledge/ changes:
    python scripts/load_chunks.py      (from backend/)

Uses the SNOWFLAKE_* settings in .env. The programmatic access token is passed
as the password, as Snowflake's docs describe for drivers.
"""

import json

import _setup  # noqa: F401  (adds backend/ to the import path)
import snowflake.connector

from app import config
from app.rag.chunker import load_chunks


def main():
    if not config.snowflake_enabled():
        print("Snowflake settings are missing in backend/.env. Nothing uploaded.")
        return

    chunks = load_chunks()
    sf = config.SNOWFLAKE
    connection = snowflake.connector.connect(
        account=sf["account"], user=sf["user"], password=sf["pat"], role=sf["role"] or None,
        warehouse=sf["warehouse"], database=sf["database"], schema=sf["schema"],
    )
    try:
        cursor = connection.cursor()
        # Replace everything, so deleted fact-sheet sections disappear too.
        cursor.execute("DELETE FROM KNOWLEDGE_CHUNKS")
        cursor.executemany(
            "INSERT INTO KNOWLEDGE_CHUNKS (CHUNK_ID, TEXT, SCIENTIFIC_NAME, SECTION, SOURCES, FILE, TOUCH_SAFE) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            [
                (c.chunk_id, c.text, c.scientific_name, c.section, json.dumps(c.sources), c.file,
                 None if c.touch_safe is None else str(c.touch_safe).lower())
                for c in chunks
            ],
        )
        print(f"Uploaded {len(chunks)} chunks to {sf['database']}.{sf['schema']}.KNOWLEDGE_CHUNKS")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
