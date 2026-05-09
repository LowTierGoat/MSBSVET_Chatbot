from typing import Optional, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.query_pipeline import run_pipeline, PipelineError


class QueryRequest(BaseModel):
    question: str
    history: list = []
    context: Optional[dict] = None


class QueryResponse(BaseModel):
    question: str
    answer: str                        # always present — natural language response
    data: Optional[Any] = None         # row data if DB was queried
    sql: Optional[str] = None
    row_count: Optional[int] = None
    suggested_viz: Optional[dict] = None
    chart_config: Optional[dict] = None  # same as suggested_viz, for frontend compat


app = FastAPI(title="MSBSVET Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    try:
        return run_pipeline(request.question, request.history, request.context)
    except PipelineError as e:
        raise HTTPException(status_code=400, detail={"error": e.message})