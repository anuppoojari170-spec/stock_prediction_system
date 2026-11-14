from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas.market import (
    IndexItem,
    MoversResponse,
    NewsItem,
    Quote,
    SentimentResponse,
    StockDetailsOut,
)
from app.services.market_data import market_service
from app.services.predictor import get_market_news_feed, get_market_sentiment

router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/overview", response_model=List[IndexItem])
def market_overview():
    """Fetch live values and daily % changes for major Indian indices (NIFTY 50, SENSEX, BANK NIFTY)."""
    return market_service.get_market_overview()


@router.get("/movers", response_model=MoversResponse)
def top_movers(limit: int = 5):
    """Retrieve top gainers and losers computed across tracked Indian large-caps."""
    return market_service.get_movers(limit=limit)


@router.get("/sentiment", response_model=SentimentResponse)
def market_sentiment():
    """Derive aggregate bullish/neutral/bearish market sentiment derived from multi-stock technical analysis."""
    return get_market_sentiment()


@router.get("/news", response_model=List[NewsItem])
def market_news(limit: int = 12):
    """Fetch real-time Indian stock market financial news via Google News RSS feed."""
    return get_market_news_feed(limit=limit)


@router.get("/stock/{ticker}", response_model=StockDetailsOut)
def stock_details(ticker: str):
    """Fetch institutional fundamentals and daily metrics for a given Indian stock."""
    clean_ticker = ticker.strip().upper().replace(".NS", "")
    return market_service.get_stock_details(clean_ticker)


@router.get("/quote/{ticker}", response_model=Quote)
def get_quote(ticker: str):
    """Fetch the latest live market price for a given NSE ticker symbol."""
    clean_ticker = ticker.strip().upper().replace(".NS", "")
    price = market_service.get_live_price(clean_ticker)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find live quote for {clean_ticker}"
        )
    return Quote(ticker=clean_ticker, price=price)


