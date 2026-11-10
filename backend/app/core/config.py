import os
from typing import List
from dotenv import load_dotenv

# Load .env file from backend or root directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))


class Settings:
    PROJECT_NAME: str = "TradePilot AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tradepilot-ai-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Initial paper balance for new users (₹10,00,000)
    STARTING_BALANCE: float = 1000000.0

    # Database - Persistent data stored in the project's data/ folder
    PROJECT_ROOT: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    DATA_DIR: str = os.path.join(PROJECT_ROOT, "data")
    DB_PATH: str = os.path.join(DATA_DIR, "tradepilot.db")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

    # Market Data
    MARKET_DATA_PROVIDER: str = os.getenv("MARKET_DATA_PROVIDER", "yfinance")

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5001",
        "http://127.0.0.1:8080",
        "*",
    ]


settings = Settings()

