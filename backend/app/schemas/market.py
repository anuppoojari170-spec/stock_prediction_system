from typing import List, Optional
from pydantic import BaseModel


class Quote(BaseModel):
    ticker: str
    price: float
    day_change_pct: Optional[float] = 0.0


class IndexItem(BaseModel):
    name: str
    value: Optional[float] = None
    change_pct: Optional[float] = None
    direction: Optional[str] = "up"
    error: Optional[str] = None


class MoverItem(BaseModel):
    ticker: str
    price: float
    change_pct: float


class MoversResponse(BaseModel):
    gainers: List[MoverItem]
    losers: List[MoverItem]


class SentimentResponse(BaseModel):
    label: str
    score: int
    buy: int
    sell: int
    hold: int

