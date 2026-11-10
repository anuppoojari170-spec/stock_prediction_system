from typing import Any, Dict, List, Optional
import pandas as pd

from app.core.cache import market_cache
from app.services.market_data import market_service, TRACKED_UNIVERSE


def predict_stock(ticker: str) -> Dict[str, Any]:
    """Generate technical momentum signals (MA5 vs MA20) with volatility risk assessment."""
    clean_ticker = ticker.strip().upper().replace(".NS", "")
    df = market_service.get_history(clean_ticker, period="6mo")

    if df is None or len(df) < 10:
        return {"error": f"Insufficient historical data for {clean_ticker}"}

    latest = float(df["Close"].iloc[-1])
    ma5 = float(df["Close"].rolling(5).mean().iloc[-1])
    ma20 = float(df["Close"].rolling(20).mean().iloc[-1])

    # Core crossover logic
    gap_pct = abs((ma5 - ma20) / ma20 * 100) if ma20 else 0.0

    if ma5 > ma20:
        signal = "BUY"
        confidence = 82
        recommendation = "STRONG BUY" if gap_pct >= 2.0 else "BUY"
    elif ma5 < ma20:
        signal = "SELL"
        confidence = 78
        recommendation = "STRONG SELL" if gap_pct >= 2.0 else "SELL"
    else:
        signal = "HOLD"
        confidence = 60
        recommendation = "HOLD"

    risk = _calculate_risk(df)
    prev_close = float(df["Close"].iloc[-2]) if len(df) > 1 else latest
    day_change_pct = ((latest - prev_close) / prev_close * 100) if prev_close else 0.0

    return {
        "ticker": clean_ticker,
        "current_price": round(latest, 2),
        "signal": signal,
        "confidence": confidence,
        "recommendation": recommendation,
        "risk": risk,
        "ma5": round(ma5, 2),
        "ma20": round(ma20, 2),
        "day_change_pct": round(day_change_pct, 2),
        "strength": round(gap_pct, 2),
    }


def _calculate_risk(df: pd.DataFrame, window: int = 20) -> Dict[str, Any]:
    """Calculate volatility-based risk meter from rolling daily return standard deviation."""
    returns = df["Close"].pct_change().dropna()
    if returns.empty:
        return {"level": "MEDIUM", "score": 50}

    volatility = float(returns.tail(window).std()) * 100

    if volatility < 1.0:
        return {"level": "LOW", "score": min(100, round(volatility * 30))}
    elif volatility < 2.5:
        return {"level": "MEDIUM", "score": min(100, round(30 + volatility * 15))}
    else:
        return {"level": "HIGH", "score": min(100, round(50 + volatility * 10))}


def get_chart_candles(ticker: str, period: str = "3mo") -> List[Dict[str, Any]]:
    """Return OHLCV candles formatted for TradingView Lightweight Charts."""
    clean_ticker = ticker.strip().upper().replace(".NS", "")
    df = market_service.get_history(clean_ticker, period=period)

    if df is None or df.empty:
        return []

    candles = []
    # Identify date column (could be 'Date' or 'Datetime')
    date_col = "Date" if "Date" in df.columns else ("Datetime" if "Datetime" in df.columns else df.columns[0])

    for _, row in df.iterrows():
        try:
            d = row[date_col]
            time_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
            candles.append({
                "time": time_str,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": float(row["Volume"]) if "Volume" in row and not pd.isna(row["Volume"]) else 0.0,
            })
        except Exception:
            continue

    return candles


def get_market_sentiment() -> Dict[str, Any]:
    """Derive aggregate market sentiment by evaluating technical signals across tracked universe."""
    cached = market_cache.get("market:sentiment")
    if cached is not None:
        return cached

    sample = TRACKED_UNIVERSE[:10]
    buy_count = 0
    sell_count = 0
    hold_count = 0
    evaluated = 0

    for ticker in sample:
        res = predict_stock(ticker)
        if "error" in res:
            continue
        evaluated += 1
        sig = res.get("signal")
        if sig == "BUY":
            buy_count += 1
        elif sig == "SELL":
            sell_count += 1
        else:
            hold_count += 1

    if evaluated == 0:
        return {"label": "NEUTRAL", "score": 50, "buy": 0, "sell": 0, "hold": 0}

    score = round(((buy_count - sell_count) / evaluated) * 50 + 50)
    score = max(0, min(100, score))

    if score >= 60:
        label = "BULLISH"
    elif score <= 40:
        label = "BEARISH"
    else:
        label = "NEUTRAL"

    result = {
        "label": label,
        "score": score,
        "buy": buy_count,
        "sell": sell_count,
        "hold": hold_count,
    }
    market_cache.set("market:sentiment", result, ttl=60)
    return result

