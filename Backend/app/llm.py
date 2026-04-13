import json
from openai import OpenAI
from app.config import settings
from app.schema_context import SCHEMA_CONTEXT

client = OpenAI(
    api_key=settings.llm_api_key,
    base_url=settings.llm_base_url,
)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "render_data_table",
            "description": "Use for simple lists or when the user explicitly asks for a table.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string"},
                },
                "required": ["sql"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "render_chart",
            "description": (
                "Use for any aggregate data, comparisons, or distributions "
                "(e.g., sums/counts per region/sector). "
                "Defaults to 'bar' unless 'line' or 'pie' is more appropriate."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string"},
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "line", "area", "pie"],
                    },
                    "x_axis": {
                        "type": "string",
                        "description": "The column name to use as labels (e.g. region_name)",
                    },
                    "y_axis": {
                        "type": "string",
                        "description": "The column name to use as values (e.g. total_intake)",
                    },
                },
                "required": ["sql", "chart_type", "x_axis", "y_axis"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "reformat_ui",
            "description": (
                "Use this when the user asks to change the visual format of data that is "
                "ALREADY displayed on screen — for example: 'show as bar', 'switch to pie', "
                "'make it a table', 'change to line chart', 'convert to bar chart'. "
                "This does NOT run any SQL or touch the database. "
                "IMPORTANT: if a chart is already on screen and the user only mentions a "
                "chart type without asking a new question, always prefer this tool over "
                "render_chart."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "line", "area", "pie", "table"],
                    },
                },
                "required": ["chart_type"],
            },
        },
    },
]


def analyze_and_generate(
    question: str,
    history: list = [],
    context: dict = None,
) -> dict:
    # Start with system prompt
    messages = [
        {
            "role": "system",
            "content": (
                SCHEMA_CONTEXT
                + "\nALWAYS use the provided tools. Never write SQL in a plain text message."
            ),
        }
    ]

    # Inject prior conversation turns for memory
    if history:
        messages.extend(history)

    # Tell the model what data is currently on screen so it can decide
    # whether to reformat vs re-query
    if context and context.get("results"):
        cols = list(context["results"][0].keys())
        current_type = (context.get("chart_config") or {}).get("type", "table")
        messages.append(
            {
                "role": "system",
                "content": (
                    f"Data is currently displayed on screen as a '{current_type}' "
                    f"with columns: {cols}. "
                    "If the user's request is ONLY about changing the visual format "
                    "(e.g. 'show as bar', 'make it a pie', 'switch to table'), "
                    "you MUST call 'reformat_ui' — do NOT call 'render_chart' again."
                ),
            }
        )

    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model=settings.llm_model,
        temperature=0,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
    )

    message = response.choices[0].message

    print(f"\n--- LLM DECISION ---")

    if message.tool_calls:
        tool_call = message.tool_calls[0]
        print(f"TOOL CALLED:  {tool_call.function.name}")
        print(f"ARGUMENTS:    {tool_call.function.arguments}")

        return {
            "intent": tool_call.function.name,
            "parameters": json.loads(tool_call.function.arguments),
        }

    print(f"NO TOOL CALLED. LLM SAID: {message.content[:80]}...")
    return {
        "intent": "text",
        "parameters": {"text": message.content},
    }