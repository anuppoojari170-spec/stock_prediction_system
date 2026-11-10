from typing import Dict, List, Optional
from pydantic import BaseModel


class RiskLevel(BaseModel):
    level: str  # "LOW" | "MEDIUM" | "HIGH"
    score: int  # 0 to 100


class TradePlan(BaseModel):
    entry: float
    stop_loss: float
    target_1: float
    target_2: float
    risk_reward: str


class IndicatorSignal(BaseModel):
    name: str
    value: str
    sentiment: str  # "BULLISH" | "BEARISH" | "NEUTRAL"
    weight: str


class MACDData(BaseModel):
    macd: float
    signal: float
    hist: float


class BollingerData(BaseModel):
    upper: float
    middle: float
    lower: float


class PredictionResponse(BaseModel):
    ticker: str
    current_price: float
    signal: str  # "BUY" | "SELL" | "HOLD"
    confidence: int  # 0 to 100
    recommendation: str
    risk: RiskLevel
    ma5: float
    ma20: float
    day_change_pct: float
    strength: float
    rsi: Optional[float] = None
    macd: Optional[MACDData] = None
    bollinger: Optional[BollingerData] = None
    trade_plan: Optional[TradePlan] = None
    breakdown: Optional[List[IndicatorSignal]] = None


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
