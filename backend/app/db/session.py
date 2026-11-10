import os
import sqlite3
from typing import Any, Generator, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

from app.core.config import settings


class PostgresCursorWrapper:
    """Wraps a psycopg2 cursor so that standard '?' SQL placeholders work seamlessly."""

    def __init__(self, cursor):
        self._cur = cursor

    def execute(self, sql: str, params: Optional[Any] = None):
        # Convert SQLite-style '?' placeholders to PostgreSQL '%s'
        pg_sql = sql.replace("?", "%s")
        if params is not None:
            return self._cur.execute(pg_sql, params)
        return self._cur.execute(pg_sql)

    def executemany(self, sql: str, params_seq: Any):
        pg_sql = sql.replace("?", "%s")
        return self._cur.executemany(pg_sql, params_seq)

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def fetchmany(self, size: int = 1):
        return self._cur.fetchmany(size)

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def lastrowid(self):
        # If needed in postgres, or handled via RETURNING id
        return getattr(self._cur, "lastrowid", None)

    def close(self):
        return self._cur.close()


class PostgresConnectionWrapper:
    """Wraps a psycopg2 connection to provide dictionary rows and unified cursor behavior."""

    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor(cursor_factory=RealDictCursor))

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __enter__(self):
        self._conn.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._conn.__exit__(exc_type, exc_val, exc_tb)


def is_postgres() -> bool:
    url = settings.DATABASE_URL
    return (
        url.startswith("postgresql://") or url.startswith("postgres://")
    ) and "YOUR_PASSWORD" not in url


def get_raw_connection():
    """Return an active connection: Supabase PostgreSQL if configured, otherwise local SQLite with WAL."""
    if is_postgres():
        try:
            # Fix postgresql:// prefix if using old postgres:// style
            pg_url = settings.DATABASE_URL
            if pg_url.startswith("postgres://"):
                pg_url = pg_url.replace("postgres://", "postgresql://", 1)

            conn = psycopg2.connect(pg_url, connect_timeout=10)
            return PostgresConnectionWrapper(conn)
        except Exception as e:
            print(f"[Database] Warning: Failed to connect to Supabase PostgreSQL: {e}")
            print(f"[Database] Falling back to local SQLite database.")

    # Local SQLite Fallback
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Initialize database tables and indexes on Supabase PostgreSQL or local SQLite."""
    conn = get_raw_connection()
    cur = conn.cursor()

    if is_postgres() and isinstance(conn, PostgresConnectionWrapper):
        print(f"[Database] Connected to Cloud Supabase PostgreSQL! Initializing schemas...")

        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            balance NUMERIC(15, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'INR',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

        CREATE TABLE IF NOT EXISTS portfolios (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ticker VARCHAR(50) NOT NULL,
            shares INTEGER NOT NULL,
            avg_price NUMERIC(15, 2) NOT NULL,
            invested_amount NUMERIC(15, 2) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, ticker)
        );
        CREATE INDEX IF NOT EXISTS idx_portfolios_user_ticker ON portfolios(user_id, ticker);

        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ticker VARCHAR(50) NOT NULL,
            type VARCHAR(10) NOT NULL,
            quantity INTEGER NOT NULL,
            price NUMERIC(15, 2) NOT NULL,
            total NUMERIC(15, 2) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

        CREATE TABLE IF NOT EXISTS watchlists (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ticker VARCHAR(50) NOT NULL,
            pinned INTEGER DEFAULT 0,
            added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, ticker)
        );
        CREATE INDEX IF NOT EXISTS idx_watchlists_user_ticker ON watchlists(user_id, ticker);

        CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
        """)
        conn.commit()
        conn.close()
        print(f"[Database] Supabase PostgreSQL tables verified successfully.")
        return

    # SQLite Schema Initialization
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        balance REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        shares INTEGER NOT NULL,
        avg_price REAL NOT NULL,
        invested_amount REAL NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, ticker),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_portfolios_user_ticker ON portfolios(user_id, ticker)")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS watchlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        pinned INTEGER DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, ticker),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_watchlists_user_ticker ON watchlists(user_id, ticker)")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)")

    conn.commit()
    conn.close()


def get_db():
    """Dependency that yields a database connection and handles cleanup."""
    conn = get_raw_connection()
    try:
        yield conn
    finally:
        conn.close()
