import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.schemas.benchmark import BenchmarkRequest, BenchmarkResponse
from app.services.backtester import backtester_service
from app.services.model_benchmark import model_benchmark_service

router = APIRouter(prefix="/backtest", tags=["Algorithmic Backtesting"])
logger = logging.getLogger("TradeAIPilot.Backtest")


@router.post("/run", response_model=BacktestResponse, summary="Run Quantitative Strategy Backtest")
def run_backtest(req: BacktestRequest):
    """
    Executes historical event-driven backtesting for algorithmic trading strategies
    on Indian equities (NSE/BSE). Computes equity curve, trade logs, and institutional metrics
    (Sharpe, Sortino, Alpha, Max Drawdown, Profit Factor).
    """
    try:
        return backtester_service.run_backtest(req)
    except Exception as e:
        logger.error(f"Error executing backtest for {req.ticker}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backtest execution failed: {str(e)}",
        )


@router.post("/benchmark", response_model=BenchmarkResponse, summary="Run Multi-Model ML Benchmark Suite")
def run_model_benchmark(req: BenchmarkRequest):
    """
    Executes walk-forward comparative benchmarking across 5 machine learning models:
    Ridge Regression, Random Forest, GBDT, LSTM, and Moving Average Crossover.
    Computes Directional Accuracy, Precision, Recall, F1-Score, RMSE, Sharpe Ratio,
    and cumulative equity curves.
    """
    try:
        return model_benchmark_service.run_benchmark(req)
    except Exception as e:
        logger.error(f"Error executing model benchmark for {req.ticker}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model benchmark execution failed: {str(e)}",
        )

