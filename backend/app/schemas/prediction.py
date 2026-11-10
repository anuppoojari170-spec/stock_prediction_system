from typing import List, Optional
from pydantic import BaseModel


class RiskLevel(BaseModel):
    level: str
    score: int


class PredictionResponse(BaseModel):
    ticker: str
    current_price: float
    signal: str
    confidence: int
    recommendation: str
    risk: RiskLevel
    ma5: float
    ma20: float
    day_change_pct: float
    strength: float


class ChartCandle(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = 0.0


class ChartHistoryResponse(BaseModel):
    ticker: str
    candles: List[ChartCandle]

