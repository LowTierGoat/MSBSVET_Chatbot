# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database (llm_user — read only)
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "msbsvet"
    db_user: str = "msbsvet_user"
    db_password: str = "msbsvet_pass"

    # LLM
    llm_provider: str = "groq"          # "groq" | "ollama"
    llm_model: str = "openai/gpt-oss-20b" 
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str = ""               # set in .env

    class Config:
        env_file = ".env"

settings = Settings()