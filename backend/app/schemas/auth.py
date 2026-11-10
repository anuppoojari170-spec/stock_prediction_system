from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=120, pattern=r"^[\w\.\-]+@[\w\.\-]+\.\w+$")
    username: str = Field(..., min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    full_name: str = Field(..., min_length=2, max_length=60)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    login: str = Field(..., description="Email or Username")
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    created_at: Optional[str] = None
    balance: float = 0.0


class UserBalance(BaseModel):
    balance: float
    currency: str = "INR"
