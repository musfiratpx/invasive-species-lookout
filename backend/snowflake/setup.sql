-- One-time Snowflake setup for RAG retrieval (run in a Snowflake worksheet).
-- Creates the table that holds fact-sheet chunks and a Cortex Search service over it.
-- Docs: https://docs.snowflake.com/en/sql-reference/sql/create-cortex-search
--
-- Before running: replace COMPUTE_WH with your warehouse name (same as SNOWFLAKE_WAREHOUSE in .env).
-- After running:  python scripts/load_chunks.py   (from backend/) to fill the table.
--
-- Note: to use a programmatic access token (PAT), Snowflake requires your user
-- to be covered by a network policy. See:
-- https://docs.snowflake.com/en/user-guide/programmatic-access-tokens

CREATE DATABASE IF NOT EXISTS INVASIVE_WATCH;
CREATE SCHEMA IF NOT EXISTS INVASIVE_WATCH.PUBLIC;
USE SCHEMA INVASIVE_WATCH.PUBLIC;

-- One row per "## section" of a fact sheet in backend/knowledge/
CREATE TABLE IF NOT EXISTS KNOWLEDGE_CHUNKS (
    CHUNK_ID        STRING,   -- e.g. celastrus-orbiculatus#summary
    TEXT            STRING,   -- the section text (this is what gets searched)
    SCIENTIFIC_NAME STRING,   -- name on the NY list, or GENERAL for non-species files
    SECTION         STRING,   -- e.g. Summary, History, How to handle it
    SOURCES         STRING,   -- JSON list of {title, url}
    FILE            STRING,   -- source file name
    TOUCH_SAFE      STRING    -- 'true' / 'false' / NULL (set by the Researcher, never by AI)
);

-- SCIENTIFIC_NAME and SECTION are ATTRIBUTES so the app can filter on them.
CREATE OR REPLACE CORTEX SEARCH SERVICE KNOWLEDGE_SEARCH
    ON TEXT
    ATTRIBUTES SCIENTIFIC_NAME, SECTION
    WAREHOUSE = COMPUTE_WH
    TARGET_LAG = '1 hour'
AS (
    SELECT CHUNK_ID, TEXT, SCIENTIFIC_NAME, SECTION, SOURCES, FILE, TOUCH_SAFE
    FROM KNOWLEDGE_CHUNKS
);
