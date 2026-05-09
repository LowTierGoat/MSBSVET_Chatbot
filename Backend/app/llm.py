import json
from openai import OpenAI, BadRequestError
from app.config import settings
from app.schema_context import SCHEMA_CONTEXT

client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_database",
            "description": (
                "Execute a SQL SELECT query to retrieve data from the MSBSVET database. "
                "Use when the question requires actual data — counts, lists, comparisons, "
                "rankings, or any factual lookup. Always prefer course_name ILIKE over "
                "exact course_code matching unless the user explicitly provides a verified code."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "Valid PostgreSQL SELECT query"},
                    "reasoning": {"type": "string", "description": "One sentence: why this SQL answers the question"}
                },
                "required": ["sql", "reasoning"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "answer_directly",
            "description": (
                "Answer the user directly without querying the database. Use for: "
                "general knowledge questions, explanations of terms, follow-ups on "
                "already-visible data, greetings, clarifications, or anything that "
                "does not require fresh data from the DB."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "answer": {"type": "string"}
                },
                "required": ["answer"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "clarify",
            "description": "Ask the user a clarifying question when the request is genuinely ambiguous and cannot be reasonably inferred.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"}
                },
                "required": ["question"]
            }
        }
    }
]


def _build_messages(question: str, history: list, context: dict) -> list:
    messages = [{"role": "system", "content": SCHEMA_CONTEXT}]

    if history:
        messages.extend(history)

    if context and isinstance(context.get("data"), list) and context["data"]:
        cols = list(context["data"][0].keys()) if context["data"] else []
        preview = context["data"][:3]
        context_hint = (
            f"[SYSTEM: Data is currently visible to the user. "
            f"Columns: {cols}. Preview: {preview}. "
            f"Previous answer: {context.get('answer', '')}. "
            f"If the user is asking to reformat, filter, or discuss this data, "
            f"use answer_directly or reformat it — do NOT re-query the database.]"
        )
        messages.append({"role": "user", "content": context_hint})
        messages.append({"role": "assistant", "content": "Understood, I have the current data context."})

    messages.append({"role": "user", "content": question})
    return messages


def compose_answer(question: str, results: list, history: list) -> str:
    """Pass 2: given raw DB results, ask the LLM to write a natural language answer."""
    preview = results[:50]  # cap to avoid token overflow
    row_count = len(results)

    prompt = (
        f'The user asked: "{question}"\n\n'
        f"The database returned {row_count} row(s):\n{json.dumps(preview, indent=2, default=str)}\n\n"
        f"Write a clear, specific, natural language answer summarizing the key takeaways. "
        f"CRITICAL RULE: Do NOT generate markdown tables, ASCII art, or text-based charts. " # <--- ADD THIS
        f"The UI will automatically render interactive tables and charts below your text. " # <--- ADD THIS
        f"Just provide a 2-3 sentence summary of the numbers."
    )

    response = client.chat.completions.create(
        model=settings.llm_model,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


def analyze_and_generate(question: str, history: list = [], context: dict = None) -> dict:
    messages = _build_messages(question, history, context)

    print(f"\n--- DEBUG: CONTEXT SENT TO LLM ---")
    print(f"History length: {len(history)}")
    print(f"Context present: {context is not None}")

    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            temperature=0,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",   # model decides — no forced tool use
        )
    except BadRequestError as e:
        # Model generated raw SQL without wrapping in a tool call
        # Recover from the failed_generation field
        try:
            error_body = e.response.json()
            failed_gen = error_body.get("error", {}).get("failed_generation", "")
            if failed_gen.strip().upper().startswith(("SELECT", "WITH")):
                print(f"--- RECOVERED from tool_use_failed, extracting raw SQL ---")
                return {
                    "intent": "query_database",
                    "parameters": {
                        "sql": failed_gen.strip(),
                        "reasoning": "Recovered from failed tool call"
                    }
                }
        except Exception:
            pass
        raise  # re-raise if we can't recover

    msg = response.choices[0].message

    print(f"\n--- LLM DECISION ---")

    # Model chose not to call any tool — treat as direct answer
    if not msg.tool_calls:
        print(f"NO TOOL CALLED. Treating as direct answer.")
        return {
            "intent": "answer_directly",
            "parameters": {"answer": msg.content or "I'm not sure how to answer that."}
        }

    tool = msg.tool_calls[0]
    params = json.loads(tool.function.arguments)
    print(f"TOOL CALLED: {tool.function.name}")
    print(f"ARGUMENTS: {tool.function.arguments}")

    return {"intent": tool.function.name, "parameters": params}