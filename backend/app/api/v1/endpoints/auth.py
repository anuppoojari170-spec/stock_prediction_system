import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.auth import Token, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: sqlite3.Connection = Depends(get_db)):
    """Register a new user account with a seeded virtual ₹10,00,000 balance."""
    cur = db.cursor()

    # Check for duplicate email or username
    cur.execute(
        "SELECT id FROM users WHERE email = ? OR username = ?",
        (user_in.email.lower(), user_in.username.lower())
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
            (user_in.email.lower(), user_in.username.lower(), user_in.full_name, hashed_pw)
        )
        cur.execute("SELECT id FROM users WHERE email = ?", (user_in.email.lower(),))
        user_id = cur.fetchone()["id"]

        # Seed account with starting balance
        cur.execute(
            """
            INSERT INTO accounts (user_id, balance, currency)
            VALUES (?, ?, 'INR')
            """,
            (user_id, settings.STARTING_BALANCE)
        )

        # Seed starter watchlist
        for starter_ticker in ("TCS", "INFY", "RELIANCE"):
            cur.execute(
                "INSERT INTO watchlists (user_id, ticker) VALUES (?, ?)",
                (user_id, starter_ticker)
            )

        # Welcome activity
        cur.execute(
            """
            INSERT INTO activities (user_id, message, category)
            VALUES (?, ?, 'info')
            """,
            (user_id, f"Welcome to TradePilot AI! Virtual balance of ₹{settings.STARTING_BALANCE:,.2f} credited.")
        )

    token = create_access_token(subject=user_id)
    return Token(access_token=token, token_type="bearer", expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: sqlite3.Connection = Depends(get_db)):
    """Authenticate with email or username and password to obtain a JWT token."""
    cur = db.cursor()
    login_str = login_in.login.strip().lower()

    cur.execute(
        "SELECT id, password_hash FROM users WHERE email = ? OR username = ?",
        (login_str, login_str)
    )
    user = cur.fetchone()

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

