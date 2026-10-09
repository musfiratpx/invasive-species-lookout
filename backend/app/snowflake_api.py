"""
Shared pieces for talking to Snowflake with a programmatic access token (PAT).
  - REST (base_url + headers): used by Cortex Search in retriever.py.
  - SQL connection (connect): used by Cortex COMPLETE in generator.py. On our trial
    account the REST chat endpoint returns 403, but COMPLETE through SQL works.

Docs (checked 2026-10-09):
  Auth:   https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/authentication
  Cortex: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-rest-api
Note: Snowflake only accepts a PAT if your user is covered by a network policy.
"""

from functools import lru_cache

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


@lru_cache(maxsize=1)
def connect():
    """One shared SQL connection (opened on first use). The PAT is passed as the password, per Snowflake's docs."""
    import snowflake.connector  # imported here so the app runs without Snowflake installed

    sf = config.SNOWFLAKE
    return snowflake.connector.connect(
        account=sf["account"], user=sf["user"], password=sf["pat"], role=sf["role"] or None,
        warehouse=sf["warehouse"], login_timeout=30,
    )
