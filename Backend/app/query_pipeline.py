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
    if intent == "reformat_ui":
        if not context or not context.get("results"):
            raise PipelineError(
                "reformat_ui",
                "No data on screen to reformat. Please run a query first.",
            )

        chart_type = params["chart_type"]
        is_table = chart_type == "table"

        # Carry forward x/y from the previous chart config if one exists
        prev_config = context.get("chart_config") or {}

        return {
            "question": question,
            "sql": context.get("sql"),
            "results": context["results"],
            "row_count": context.get("row_count"),
            "ui_directive": "render_data_table" if is_table else "render_chart",
            "chart_config": (
                None
                if is_table
                else {
                    "type": chart_type,
                    "x": prev_config.get("x"),
                    "y": prev_config.get("y"),
                }
            ),
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