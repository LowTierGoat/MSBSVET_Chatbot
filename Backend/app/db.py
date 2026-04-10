# app/db.py
from psycopg2 import pool
from app.config import settings

connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    host=settings.db_host,
    port=settings.db_port,
    dbname=settings.db_name,
    user=settings.db_user,
    password=settings.db_password,
)

def execute_query(sql: str) -> list[dict]:
    conn = connection_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            return [dict(zip(columns, row)) for row in rows]
    finally:
        connection_pool.putconn(conn)