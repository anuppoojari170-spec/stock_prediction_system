from typing import Any, Dict, List, Optional
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


class HorizonForecast(BaseModel):
    horizon_days: int  # 1, 3, 5
    label: str  # "T+1 (Tomorrow)", "T+3 (Swing)", "T+5 (Weekly)"
    target_price: float
    expected_change_pct: float
    probability_up: float  # 0 to 100
    lower_bound: float
    upper_bound: float
    direction: str  # "BULLISH" | "BEARISH" | "NEUTRAL"


class FeatureWeight(BaseModel):
    factor: str
    weight_pct: float
    impact: str  # "POSITIVE" | "NEGATIVE" | "NEUTRAL"


class ModelAccuracy(BaseModel):
    directional_hit_rate_pct: float
    backtested_sessions: int
    mape_pct: float


class ForecastPoint(BaseModel):
    date: str
    target: float
    lower: float
    upper: float
    is_anchor: Optional[bool] = False


class MLForecastData(BaseModel):
    horizons: List[HorizonForecast]
    feature_importance: List[FeatureWeight]
    model_accuracy: ModelAccuracy
    forecast_points: List[ForecastPoint]


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
    ml_forecast: Optional[MLForecastData] = None


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
