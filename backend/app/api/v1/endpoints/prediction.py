from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.schemas.prediction import (
    AICommentaryResponse,
    AIChatRequest,
    AIChatResponse,
    ChartCandle,
    ChartHistoryResponse,
    PredictionResponse,
)
from app.services.predictor import get_chart_candles, predict_stock
from app.services.ai_assistant import ai_assistant

router = APIRouter(prefix="/prediction", tags=["AI Prediction & Analysis"])


class PredictRequest(BaseModel):
    ticker: str


class CommentaryRequest(BaseModel):
    ticker: str
    mode: Optional[str] = "pro"


@router.post("/analyze", response_model=PredictionResponse)
def analyze_stock(req: PredictRequest):
    """Run technical analysis, ML multi-horizon forecasting, and AI narrative synthesis on a stock."""
    ticker = req.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid stock symbol.")

    result = predict_stock(ticker)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])

    return result


@router.post("/commentary", response_model=AICommentaryResponse)
def get_stock_commentary(req: CommentaryRequest):
    """Fetch dedicated AI trade thesis, catalyst breakdown, risk analysis, and beginner takeaways."""
    ticker = req.ticker.strip().upper()
    pred = predict_stock(ticker)
    if "error" in pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=pred["error"])

    commentary = ai_assistant.generate_commentary(pred, mode=req.mode or "pro")
    return commentary


@router.post("/assistant/chat", response_model=AIChatResponse)
def chat_with_assistant(req: AIChatRequest):
    """Interactive conversational AI Trading Copilot with live stock context and risk guidance."""
    active_pred = None
    if req.ticker:
        try:
            active_pred = predict_stock(req.ticker.strip().upper())
        except Exception:
            active_pred = None

    response = ai_assistant.handle_chat(req.model_dump(), active_pred=active_pred)
    return response


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

