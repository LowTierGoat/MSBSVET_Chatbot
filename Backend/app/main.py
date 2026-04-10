# app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.query_pipeline import run_pipeline, PipelineError
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Chatbot Query API",
    description="Natural language to SQL over normalized MSRTC operations data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    question: str
    sql: str
    row_count: int
    results: list[dict]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    try:
        result = run_pipeline(request.question)
        return result
    except PipelineError as e:
        raise HTTPException(
            status_code=400,
            detail={"stage": e.stage, "error": e.message}
        )