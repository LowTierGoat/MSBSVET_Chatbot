# app/validator.py
import sqlglot
from sqlglot import errors

class QueryValidationError(Exception):
    pass

def validate_query(sql: str) -> str:
    # 1. Strip whitespace
    sql = sql.strip()

    # 2. Parse — catches syntax errors
    try:
        parsed = sqlglot.parse_one(sql, dialect="postgres")
    except errors.ParseError as e:
        raise QueryValidationError(f"Invalid SQL syntax: {e}")

    # 3. Must be a SELECT
    if parsed.key != "select":
        raise QueryValidationError(
            f"Only SELECT queries are allowed. Got: {parsed.key.upper()}"
        )

    # 4. No subversive statements hiding inside (e.g. CTEs with DDL)
    for node in parsed.walk():
        if node.key in ("drop", "insert", "update", "delete", "create", "alter", "truncate"):
            raise QueryValidationError(
                f"Forbidden statement found inside query: {node.key.upper()}"
            )

    # 5. Return the cleaned SQL
    return sql