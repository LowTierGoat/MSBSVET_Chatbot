# app/llm.py
from openai import OpenAI
from app.config import settings
from app.schema_context import SCHEMA_CONTEXT

client = OpenAI(
    api_key=settings.llm_api_key,
    base_url=settings.llm_base_url,
)

def generate_sql(question: str) -> str:
    response = client.chat.completions.create(
        model=settings.llm_model,
        temperature=0,
        messages=[
            {"role": "system", "content": SCHEMA_CONTEXT},
            {"role": "user", "content": f"Generate a PostgreSQL query to answer this question:\n\n{question}"}
        ]
    )

    sql = response.choices[0].message.content.strip()
    
    # Strip markdown code fences if the LLM ignores Rule #6
    if sql.startswith("```"):
        sql = sql.split("```")[1]          # get content between fences
        if sql.startswith("sql"):
            sql = sql[3:]                  # strip the "sql" language tag
    
    return sql.strip()