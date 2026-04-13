from app.llm import analyze_and_generate
from app.validator import validate_query, QueryValidationError
from app.db import execute_query
from app.visuals import format_chart_config


class PipelineError(Exception):
    def __init__(self, stage: str, message: str):
        self.stage = stage
        self.message = message
        super().__init__(f"[{stage}] {message}")


def run_pipeline(
    question: str,
    history: list = [],
    context: dict = None,
) -> dict:
    plan = analyze_and_generate(question, history, context)
    intent = plan["intent"]
    params = plan["parameters"]

    # ── SHORT CIRCUIT ────────────────────────────────────────────────────────
    # User just wants to change the visual type of data already on screen.
    # Skip the DB entirely — reuse whatever is already in context.
    # --- SHORT CIRCUIT: REUSE DATA ---
    if intent == "reformat_ui" and context:
        ctype = params['chart_type']
        old_config = context.get("chart_config") or {} # <--- Safety fallback
        
        return {
            "question": question,
            "ui_directive": "render_data_table" if ctype == "table" else "render_chart",
            "results": context["results"],
            "sql": context.get("sql"),
            "row_count": context.get("row_count"),
            "chart_config": {
                "type": ctype, 
                "x": old_config.get("x"), # Safe get
                "y": old_config.get("y")  # Safe get
            } if ctype != "table" else None
        }

    # ── TEXT FALLBACK ────────────────────────────────────────────────────────
    if intent == "text":
        return {
            "question": question,
            "ui_directive": "text",
            "results": params.get("text"),
            "sql": None,
            "row_count": None,
            "chart_config": None,
        }

    # ── NORMAL PATH: VALIDATE → EXECUTE → FORMAT ─────────────────────────────
    try:
        raw_sql = params.get("sql")
        safe_sql = validate_query(raw_sql)
        results = execute_query(safe_sql)

        chart_config = None
        if intent == "render_chart":
            chart_config = format_chart_config(params)

        return {
            "question": question,
            "sql": safe_sql,
            "results": results,
            "row_count": len(results),
            "ui_directive": intent,
            "chart_config": chart_config,
        }

    except QueryValidationError as e:
        raise PipelineError("validator", str(e))
    except Exception as e:
        raise PipelineError("executor", str(e))