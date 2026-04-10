# app/query_pipeline.py
from app.llm import generate_sql
from app.validator import validate_query, QueryValidationError
from app.db import execute_query

class PipelineError(Exception):
    def __init__(self, stage: str, message: str):
        self.stage = stage
        self.message = message
        super().__init__(f"[{stage}] {message}")

def run_pipeline(question: str) -> dict:
    # Stage 1 — Generate SQL
    try:
        raw_sql = generate_sql(question)
    except Exception as e:
        raise PipelineError("llm", f"Failed to generate SQL: {e}")

    # Stage 2 — Validate
    try:
        safe_sql = validate_query(raw_sql)
    except QueryValidationError as e:
        raise PipelineError("validator", str(e))

    # Stage 3 — Execute
    try:
        results = execute_query(safe_sql)
    except Exception as e:
        raise PipelineError("executor", f"Query execution failed: {e}")

    return {
        "question": question,
        "sql": safe_sql,
        "row_count": len(results),
        "results": results,
        "note": "Query executed successfully but returned no matching rows." if len(results) == 0 else None
    }