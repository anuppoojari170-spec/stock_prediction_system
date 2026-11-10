import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.services.backtester import backtester_service

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

