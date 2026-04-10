#!/usr/bin/env python3
"""
MSBSVET ETL — Flat Excel → Normalized PostgreSQL
Usage: python populate_db.py [excel_file]
Defaults to MSBSVET.xlsx in the same directory.
"""

import sys
import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ── Config (override via env vars or edit here) ────────────────────────────
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "msbsvet")
DB_USER = os.getenv("DB_USER", "msbsvet_user")
DB_PASS = os.getenv("DB_PASS", "msbsvet_pass")
EXCEL_FILE = sys.argv[1] if len(sys.argv) > 1 else "MSBSVET.xlsx"

DSN = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASS}"

# ── DDL ────────────────────────────────────────────────────────────────────
DDL = """
CREATE TABLE IF NOT EXISTS sector (
    sector_id   SERIAL PRIMARY KEY,
    sector_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS course_category (
    category_id   SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS course (
    course_code TEXT PRIMARY KEY,
    sector_id   INT  NOT NULL REFERENCES sector(sector_id),
    category_id INT  NOT NULL REFERENCES course_category(category_id),
    course_name TEXT NOT NULL,
    duration    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS region (
    region_id   SERIAL PRIMARY KEY,
    region_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS district (
    district_id   SERIAL PRIMARY KEY,
    region_id     INT  NOT NULL REFERENCES region(region_id),
    district_name TEXT NOT NULL,
    UNIQUE (region_id, district_name)
);

CREATE TABLE IF NOT EXISTS institute (
    institute_code TEXT PRIMARY KEY,
    district_id    INT  NOT NULL REFERENCES district(district_id),
    institute_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS institute_course (
    id             SERIAL PRIMARY KEY,
    institute_code TEXT NOT NULL REFERENCES institute(institute_code),
    course_code    TEXT NOT NULL REFERENCES course(course_code),
    mode           TEXT NOT NULL CHECK (mode IN ('FULL TIME', 'PART TIME')),
    intake         INT  NOT NULL CHECK (intake > 0),
    UNIQUE (institute_code, course_code)
);
"""


def load_excel(path: str):
    print(f"Reading {path} ...")
    courses_df = pd.read_excel(path, sheet_name="Course Details")
    institutes_df = pd.read_excel(path, sheet_name="Institute Details")
    print(f"  Course Details:    {len(courses_df):>5} rows")
    print(f"  Institute Details: {len(institutes_df):>5} rows")
    return courses_df, institutes_df


def create_schema(cur):
    print("Creating schema ...")
    cur.execute(DDL)


def insert_lookup(cur, table: str, col: str, values) -> dict:
    """Insert unique string values into a lookup table, return name→id map."""
    rows = [(v,) for v in sorted(set(values))]
    execute_values(
        cur,
        f"INSERT INTO {table} ({col}) VALUES %s ON CONFLICT ({col}) DO NOTHING",
        rows,
    )
    cur.execute(f"SELECT {col}, {table.split('_')[0]}_id FROM {table}")
    # Handle tables whose PK name doesn't follow simple pattern
    rows_fetched = cur.fetchall()
    return {name: pk for name, pk in rows_fetched}


def insert_sectors(cur, df) -> dict:
    print("Inserting sectors ...")
    cur.execute(
        "INSERT INTO sector (sector_name) "
        "SELECT UNNEST(%s::text[]) ON CONFLICT (sector_name) DO NOTHING",
        (list(df["Sector"].unique()),),
    )
    cur.execute("SELECT sector_name, sector_id FROM sector")
    return dict(cur.fetchall())


def insert_categories(cur, df) -> dict:
    print("Inserting course categories ...")
    cur.execute(
        "INSERT INTO course_category (category_name) "
        "SELECT UNNEST(%s::text[]) ON CONFLICT (category_name) DO NOTHING",
        (list(df["Course Category"].unique()),),
    )
    cur.execute("SELECT category_name, category_id FROM course_category")
    return dict(cur.fetchall())


def insert_courses(cur, df, sector_map, category_map):
    print("Inserting courses ...")
    rows = [
        (
            row["Course Code"],
            sector_map[row["Sector"]],
            category_map[row["Course Category"]],
            row["Course"],
            row["Duration"],
        )
        for _, row in df.iterrows()
    ]
    execute_values(
        cur,
        """
        INSERT INTO course (course_code, sector_id, category_id, course_name, duration)
        VALUES %s
        ON CONFLICT (course_code) DO NOTHING
        """,
        rows,
    )
    print(f"  {len(rows)} courses processed")


def insert_regions(cur, df) -> dict:
    print("Inserting regions ...")
    cur.execute(
        "INSERT INTO region (region_name) "
        "SELECT UNNEST(%s::text[]) ON CONFLICT (region_name) DO NOTHING",
        (list(df["Region"].unique()),),
    )
    cur.execute("SELECT region_name, region_id FROM region")
    return dict(cur.fetchall())


def insert_districts(cur, df, region_map) -> dict:
    print("Inserting districts ...")
    pairs = df[["Region", "District"]].drop_duplicates().values.tolist()
    rows = [(region_map[r], d) for r, d in pairs]
    execute_values(
        cur,
        """
        INSERT INTO district (region_id, district_name)
        VALUES %s
        ON CONFLICT (region_id, district_name) DO NOTHING
        """,
        rows,
    )
    cur.execute(
        "SELECT d.district_name, r.region_name, d.district_id "
        "FROM district d JOIN region r USING (region_id)"
    )
    # key = (region_name, district_name) to handle same district name in different regions
    return {(rn, dn): did for dn, rn, did in cur.fetchall()}


def insert_institutes(cur, df, district_map):
    print("Inserting institutes ...")
    inst_df = df[["Institute Code", "Institute Name", "Region", "District"]].drop_duplicates(
        subset=["Institute Code"]
    )
    rows = [
        (
            row["Institute Code"],
            district_map[(row["Region"], row["District"])],
            row["Institute Name"],
        )
        for _, row in inst_df.iterrows()
    ]
    execute_values(
        cur,
        """
        INSERT INTO institute (institute_code, district_id, institute_name)
        VALUES %s
        ON CONFLICT (institute_code) DO NOTHING
        """,
        rows,
    )
    print(f"  {len(rows)} institutes processed")


def insert_institute_courses(cur, df):
    print("Inserting institute–course offerings ...")
    rows = [
        (
            row["Institute Code"],
            row["Course Code"],
            row["Full Time / Part Time"].strip().upper(),
            int(row["Intake"]),
        )
        for _, row in df.iterrows()
    ]
    execute_values(
        cur,
        """
        INSERT INTO institute_course (institute_code, course_code, mode, intake)
        VALUES %s
        ON CONFLICT (institute_code, course_code) DO NOTHING
        """,
        rows,
    )
    print(f"  {len(rows)} offerings processed")


def print_counts(cur):
    tables = ["sector", "course_category", "course", "region", "district", "institute", "institute_course"]
    print("\n── Row counts ──────────────────────────────")
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t:<20} {cur.fetchone()[0]:>6}")
    print("────────────────────────────────────────────")


def main():
    courses_df, institutes_df = load_excel(EXCEL_FILE)

    print(f"\nConnecting to PostgreSQL at {DB_HOST}:{DB_PORT}/{DB_NAME} ...")
    conn = psycopg2.connect(DSN)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            create_schema(cur)

            # Course domain
            sector_map   = insert_sectors(cur, courses_df)
            category_map = insert_categories(cur, courses_df)
            insert_courses(cur, courses_df, sector_map, category_map)

            # Institute domain
            region_map   = insert_regions(cur, institutes_df)
            district_map = insert_districts(cur, institutes_df, region_map)
            insert_institutes(cur, institutes_df, district_map)

            # Junction
            insert_institute_courses(cur, institutes_df)

            print_counts(cur)

        conn.commit()
        print("\nDone — all data committed successfully.")

    except Exception as e:
        conn.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()