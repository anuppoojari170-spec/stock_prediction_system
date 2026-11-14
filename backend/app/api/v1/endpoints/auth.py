import sqlite3
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db, is_postgres, PostgresConnectionWrapper
from app.api.deps import get_current_user
from app.schemas.auth import Token, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])


def mirror_user_to_alternate_db(email: str, username: str, full_name: str, password_hash: str):
    """Mirrors a registered user to the alternate database so logins persist across sessions."""
    try:
        if is_postgres():
            # Active DB is Postgres; mirror into local SQLite
            conn_sql = sqlite3.connect(settings.DB_PATH, timeout=5.0)
            cur_sql = conn_sql.cursor()
            cur_sql.execute(
                "INSERT OR IGNORE INTO users (email, username, full_name, password_hash) VALUES (?, ?, ?, ?)",
                (email, username, full_name, password_hash)
            )
            cur_sql.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,))
            row = cur_sql.fetchone()
            if row:
                cur_sql.execute(
                    "INSERT OR IGNORE INTO accounts (user_id, balance, currency) VALUES (?, ?, 'INR')",
                    (row[0], settings.STARTING_BALANCE)
                )
            conn_sql.commit()
            conn_sql.close()
        else:
            # Active DB is SQLite; mirror into Supabase Postgres if configured
            if settings.DATABASE_URL and "postgresql://" in settings.DATABASE_URL:
                import psycopg2
                conn_pg = psycopg2.connect(settings.DATABASE_URL, connect_timeout=5)
                cur_pg = conn_pg.cursor()
                cur_pg.execute(
                    "INSERT INTO users (email, username, full_name, password_hash) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING id",
                    (email, username, full_name, password_hash)
                )
                res = cur_pg.fetchone()
                if res:
                    cur_pg.execute(
                        "INSERT INTO accounts (user_id, balance, currency) VALUES (%s, %s, 'INR') ON CONFLICT DO NOTHING",
                        (res[0], settings.STARTING_BALANCE)
                    )
                conn_pg.commit()
                conn_pg.close()
    except Exception:
        pass


def sync_and_find_user(login_str: str, active_db) -> Optional[Dict[str, Any]]:
    """If user not found in active DB, checks the alternate DB and imports them seamlessly."""
    try:
        is_pg = is_postgres() and isinstance(active_db, PostgresConnectionWrapper)
        
        if is_pg:
            # Currently active in Postgres -> check SQLite
            conn_sql = sqlite3.connect(settings.DB_PATH, timeout=5.0)
            conn_sql.row_factory = sqlite3.Row
            cur_sql = conn_sql.cursor()
            cur_sql.execute(
                "SELECT id, email, username, full_name, password_hash FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)",
                (login_str, login_str)
            )
            found = cur_sql.fetchone()
            conn_sql.close()
            if found:
                cur_act = active_db.cursor()
                cur_act.execute(
                    "INSERT INTO users (email, username, full_name, password_hash) VALUES (%s, %s, %s, %s) RETURNING id, password_hash",
                    (found["email"].lower(), found["username"].lower(), found["full_name"], found["password_hash"])
                )
                new_user = cur_act.fetchone()
                cur_act.execute(
                    "INSERT INTO accounts (user_id, balance, currency) VALUES (%s, %s, 'INR') ON CONFLICT DO NOTHING",
                    (new_user["id"], settings.STARTING_BALANCE)
                )
                active_db.commit()
                return new_user
        else:
            # Currently active in SQLite -> check Postgres
            if settings.DATABASE_URL and "postgresql://" in settings.DATABASE_URL:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                conn_pg = psycopg2.connect(settings.DATABASE_URL, connect_timeout=5)
                cur_pg = conn_pg.cursor(cursor_factory=RealDictCursor)
                cur_pg.execute(
                    "SELECT id, email, username, full_name, password_hash FROM users WHERE LOWER(email) = LOWER(%s) OR LOWER(username) = LOWER(%s)",
                    (login_str, login_str)
                )
                found = cur_pg.fetchone()
                conn_pg.close()
                if found:
                    cur_act = active_db.cursor()
                    cur_act.execute(
                        "INSERT INTO users (email, username, full_name, password_hash) VALUES (?, ?, ?, ?)",
                        (found["email"].lower(), found["username"].lower(), found["full_name"], found["password_hash"])
                    )
                    cur_act.execute("SELECT id, password_hash FROM users WHERE LOWER(username) = LOWER(?)", (found["username"].lower(),))
                    new_user = cur_act.fetchone()
                    cur_act.execute(
                        "INSERT INTO accounts (user_id, balance, currency) VALUES (?, ?, 'INR')",
                        (new_user["id"], settings.STARTING_BALANCE)
                    )
                    active_db.commit()
                    return new_user
    except Exception:
        pass
    return None


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: sqlite3.Connection = Depends(get_db)):
    """Register a new user account with a seeded virtual ₹10,00,000 balance."""
    cur = db.cursor()
    clean_email = user_in.email.strip().lower()
    clean_username = user_in.username.strip().lower()

    # Case-insensitive duplicate check
    cur.execute(
        "SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)",
        (clean_email, clean_username)
    )
    if cur.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists."
        )

    hashed_pw = hash_password(user_in.password)

    with db:
        # Create user
        cur.execute(
            """
            INSERT INTO users (email, username, full_name, password_hash)
            VALUES (?, ?, ?, ?)
            """,
            (clean_email, clean_username, user_in.full_name.strip(), hashed_pw)
        )
        cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (clean_email,))
        user_id = cur.fetchone()["id"]

        # Seed account with starting balance
        cur.execute(
            """
            INSERT INTO accounts (user_id, balance, currency)
            VALUES (?, ?, 'INR')
            """,
            (user_id, settings.STARTING_BALANCE)
        )

        # Welcome activity
        cur.execute(
            """
            INSERT INTO activities (user_id, message, category)
            VALUES (?, ?, 'info')
            """,
            (user_id, f"Welcome to TradePilot AI! Virtual balance of ₹{settings.STARTING_BALANCE:,.2f} credited.")
        )

    # Mirror user to alternate database to prevent cross-session loss
    mirror_user_to_alternate_db(clean_email, clean_username, user_in.full_name.strip(), hashed_pw)

    token = create_access_token(subject=user_id)
    return Token(access_token=token, token_type="bearer", expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: sqlite3.Connection = Depends(get_db)):
    """Authenticate with email or username and password to obtain a JWT token."""
    cur = db.cursor()
    login_str = login_in.login.strip().lower()

    # Case-insensitive query
    cur.execute(
        "SELECT id, password_hash FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)",
        (login_str, login_str)
    )
    user = cur.fetchone()

    # If not found in current active database, check alternate database and sync over
    if not user:
        user = sync_and_find_user(login_str, db)

    if not user or not verify_password(login_in.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user["id"])
    return Token(access_token=token, token_type="bearer", expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)


@router.get("/me", response_model=UserOut)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Return profile details and available virtual balance for the authenticated user."""
    return UserOut(**current_user)
