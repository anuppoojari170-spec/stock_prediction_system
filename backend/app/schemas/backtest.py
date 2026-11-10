from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class StrategyType(str, Enum):
    AI_ENSEMBLE = "AI_ENSEMBLE"
    RSI_MEAN_REVERSION = "RSI_MEAN_REVERSION"
    MACD_CROSSOVER = "MACD_CROSSOVER"
    BOLLINGER_BANDS = "BOLLINGER_BANDS"
    EMA_CROSSOVER = "EMA_CROSSOVER"


class BacktestRequest(BaseModel):
    ticker: str = Field("RELIANCE", description="NSE/BSE stock symbol")
    strategy: StrategyType = Field(StrategyType.AI_ENSEMBLE, description="Algorithmic strategy to backtest")
    period: str = Field("1y", description="Backtest lookback period: 3mo, 6mo, 1y, 2y")
    initial_capital: float = Field(500000.0, description="Starting virtual capital in INR")
    slippage_pct: float = Field(0.05, description="Simulated execution slippage in percent")
    brokerage_per_trade: float = Field(20.0, description="Indian flat brokerage fee per completed trade in INR")


class TradeLogItem(BaseModel):
    trade_id: int
    entry_date: str
    exit_date: str
    side: str = "BUY"
    entry_price: float
    exit_price: float
    shares: int
    pnl: float
    return_pct: float
    holding_days: int
    exit_reason: str


class EquityPoint(BaseModel):
    date: str
    strategy_value: float
    benchmark_value: float
    drawdown_pct: float


class BacktestMetrics(BaseModel):
    initial_capital: float
    ending_capital: float
    net_profit: float
    total_return_pct: float
    benchmark_return_pct: float
    alpha_pct: float
    cagr_pct: float
    win_rate_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    profit_factor: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    avg_trade_pnl: float
    avg_win: float
    avg_loss: float
    risk_reward_realized: float


class MonthlyReturn(BaseModel):
    month: str
    return_pct: float


class BacktestResponse(BaseModel):
    ticker: str
    strategy_name: str
    period: str
    metrics: BacktestMetrics
    equity_curve: List[EquityPoint]
    trade_log: List[TradeLogItem]
    monthly_returns: List[MonthlyReturn]

