from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class OrderRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    quantity: int = Field(..., gt=0, le=100000)


class OrderResponse(BaseModel):
    message: str
    ticker: str
    quantity: int
    price: float
    total: float
    type: Literal["BUY", "SELL"]


class HoldingOut(BaseModel):
    ticker: str
    shares: int
    avg_price: float
    current_price: float
    invested: float
    current_value: float
    pnl: float
    pnl_pct: float


class PortfolioSummary(BaseModel):
    balance: float
    total_invested: float
    current_value: float
    total_pnl: float
    growth_pct: float
    holdings_count: int
    todays_pnl: float
    transactions_count: int


class TransactionOut(BaseModel):
    id: int
    ticker: str
    type: str
    quantity: int
    price: float
    total: float
    timestamp: str


class WatchlistItem(BaseModel):
    ticker: str
    pinned: bool
    added_at: Optional[str] = None


class WatchlistCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)

