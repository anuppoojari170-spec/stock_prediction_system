from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class BenchmarkRequest(BaseModel):
    ticker: str = Field("RELIANCE", description="NSE/BSE stock symbol")
    period: str = Field("1y", description="Lookback period: 6mo, 1y, 2y")
    horizon: int = Field(1, description="Forecast horizon in days (1, 3, or 5)")


class ModelMetric(BaseModel):
    model_id: str
    model_name: str
    architecture_type: str
    directional_accuracy_pct: float
    precision: float
    recall: float
    f1_score: float
    rmse_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    total_return_pct: float
    latency_ms: float
    rank: int
    is_best: bool
    description: str
    confusion_matrix: Dict[str, int]


class MultiModelEquityPoint(BaseModel):
    date: str
    benchmark: float
    ma_baseline: float
    ridge: float
    rf: float
    gbdt: float
    lstm: float


class FeatureImportanceItem(BaseModel):
    feature: str
    importance_pct: float
    category: str


class AcademicDefenseItem(BaseModel):
    question: str
    answer: str
    academic_context: str


class BenchmarkResponse(BaseModel):
    ticker: str
    period: str
    horizon_days: int
    sample_count: int
    train_samples: int
    test_samples: int
    validation_method: str
    best_model: str
    models: List[ModelMetric]
    equity_curves: List[MultiModelEquityPoint]
    feature_importance: List[FeatureImportanceItem]
    viva_defense_guide: List[AcademicDefenseItem]
