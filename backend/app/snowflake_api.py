"""
Shared pieces for calling Snowflake's REST API with a programmatic access token (PAT).
Used by both RAG steps: Cortex Search (retriever.py) and Cortex chat completions (generator.py).

Docs (checked 2026-10-09):
  Auth:   https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/authentication
  Cortex: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-rest-api
Note: Snowflake only accepts a PAT if your user is covered by a network policy.
"""

from app import config


def base_url():
    """e.g. https://myorg-myaccount.snowflakecomputing.com"""
    return f"https://{config.SNOWFLAKE['account']}.snowflakecomputing.com"


def headers():
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {config.SNOWFLAKE['pat']}",
        "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
    }
