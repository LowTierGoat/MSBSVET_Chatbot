import json
from openai import OpenAI
from app.config import settings
from app.schema_context import SCHEMA_CONTEXT

client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "render_data_table",
            "description": "Use ONLY for NEW questions requiring a fresh database query to show a list.",
            "parameters": {
                "type": "object",
                "properties": {"sql": {"type": "string"}},
                "required": ["sql"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "render_chart",
            "description": "Use ONLY for NEW questions requiring a fresh database query to visualize data. DO NOT use this if the user just wants to change the chart type of data already on screen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string"},
                    "chart_type": {"type": "string", "enum": ["bar", "line", "area", "pie"]},
                    "x_axis": {"type": "string", "description": "Labels"},
                    "y_axis": {"type": "string", "description": "Numbers"}
                },
                "required": ["sql", "chart_type", "x_axis", "y_axis"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "reformat_ui",
            "description": "CRITICAL: Use this WHENEVER the user asks to change the visual style (e.g., 'make it a pie chart', 'show as table', 'change to line graph') of the current data. DO NOT generate SQL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {"type": "string", "enum": ["bar", "line", "area", "pie", "table"]}
                },
                "required": ["chart_type"]
            }
        }
    }
]

def analyze_and_generate(question: str, history: list = [], context: dict = None) -> dict:
    messages = [{"role": "system", "content": SCHEMA_CONTEXT}]
    
    # 1. Add the Notepad (History)
    if history: 
        messages.extend(history)
    
    # 2. THE LOUD WHISTLE: Put the rule right before the user's question
    if context and context.get("results"):
        cols = list(context['results'][0].keys())
        system_alert = (
            f"SYSTEM ALERT: Data is already on screen with columns: {cols}. "
            f"If the next user message is requesting a visual change (e.g., 'pie chart', 'table'), "
            f"you MUST use 'reformat_ui'. DO NOT write SQL."
        )
        messages.append({"role": "system", "content": system_alert})
    
    # 3. Add the actual question
    messages.append({"role": "user", "content": question})

    print(f"\n--- DEBUG: CONTEXT SENT TO LLM ---")
    print(f"History length: {len(history)}")
    print(f"Context present: {context is not None}")

    response = client.chat.completions.create(
        model=settings.llm_model,
        temperature=0, # Keep it strictly logical
        messages=messages,
        tools=TOOLS,
        tool_choice="auto" 
    )

    msg = response.choices[0].message
    
    print(f"\n--- LLM DECISION ---")
    if msg.tool_calls:
        tool = msg.tool_calls[0]
        print(f"TOOL CALLED: {tool.function.name}")
        print(f"ARGUMENTS: {tool.function.arguments}")
        return {"intent": tool.function.name, "parameters": json.loads(tool.function.arguments)}
    
    print(f"NO TOOL CALLED. Text: {msg.content[:50]}...")
    return {"intent": "text", "parameters": {"text": msg.content}}