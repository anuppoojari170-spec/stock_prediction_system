"""
Database layer for the AI Stock Trading Platform.

Original tables (portfolio, transactions, account) are preserved with their
original columns intact for backward compatibility. New columns and tables
support the upgraded dashboard (P&L tracking, watchlist persistence, and the
live activity feed).
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "stock_data.db")

STARTING_BALANCE = 1000000.0


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _column_exists(cur, table, column):
    cur.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cur.fetchall())


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cur = conn.cursor()

    # Portfolio Table (original columns preserved)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS portfolio (
        ticker TEXT PRIMARY KEY,
        shares INTEGER,
        avg_price REAL
    )
    """)

    # Transactions Table (original columns preserved)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT,
        type TEXT,
        quantity INTEGER,
        price REAL,
        total REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # User Account (original columns preserved)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS account (
        id INTEGER PRIMARY KEY,
        balance REAL
    )
    """)

    # Watchlist (new - persists what used to be a JS-only array)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS watchlist (
        ticker TEXT PRIMARY KEY,
        pinned INTEGER DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Activity Feed (new - drives the Recent Activity panel)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        category TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Migration: add invested_amount to portfolio if missing (needed to
    # compute true average cost basis without breaking the original schema)
    if not _column_exists(cur, "portfolio", "invested_amount"):
        cur.execute("ALTER TABLE portfolio ADD COLUMN invested_amount REAL DEFAULT 0")

    # Insert initial balance if not exists
    cur.execute("SELECT COUNT(*) FROM account")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO account (id, balance) VALUES (?, ?)",
            (1, STARTING_BALANCE)
        )

    # Seed a starter watchlist so the UI isn't empty on first run
    cur.execute("SELECT COUNT(*) FROM watchlist")
    if cur.fetchone()[0] == 0:
        for ticker in ("TCS", "INFY", "WIPRO"):
            cur.execute(
                "INSERT OR IGNORE INTO watchlist (ticker) VALUES (?)",
                (ticker,)
            )

    conn.commit()
    conn.close()


def log_activity(message, category="info"):
    """Insert a row into the activity feed. category: trade | watchlist | signal | info"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO activity (message, category) VALUES (?, ?)",
        (message, category)
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
