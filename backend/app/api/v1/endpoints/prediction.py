from typing import List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.schemas.prediction import ChartCandle, ChartHistoryResponse, PredictionResponse
from app.services.predictor import get_chart_candles, predict_stock

router = APIRouter(prefix="/prediction", tags=["AI Prediction & Analysis"])


class PredictRequest(BaseModel):
    ticker: str


@router.post("/analyze", response_model=PredictionResponse)
def analyze_stock(req: PredictRequest):
    """Run technical analysis and momentum crossover evaluation on a stock."""
    ticker = req.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid stock symbol.")

    result = predict_stock(ticker)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])

    return result


@router.get("/history/{ticker}", response_model=ChartHistoryResponse)
def chart_history(ticker: str, period: str = "3mo"):
    """Fetch OHLCV candlestick data structured for TradingView Lightweight Charts."""
    clean_ticker = ticker.strip().upper().replace(".NS", "")
    candles = get_chart_candles(clean_ticker, period=period)
    if not candles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical chart data found for {clean_ticker}"
        )
    return ChartHistoryResponse(ticker=clean_ticker, candles=[ChartCandle(**c) for c in candles])

