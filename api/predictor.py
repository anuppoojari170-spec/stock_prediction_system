"""
Prediction engine for the AI Stock Trading Platform.

Core signal logic (MA5 vs MA20 crossover) is preserved exactly as the
original implementation so existing predictions behave the same way.
On top of that, this module adds:
  - confidence/strength/risk breakdown for the richer prediction UI
  - market index snapshots (NIFTY 50 / SENSEX / BANK NIFTY)
  - top gainers / losers across a tracked universe of NSE stocks
  - an aggregate market sentiment score derived from individual signals
"""

import yfinance as yf
import pandas as pd

# Universe of stocks used for "Top Gainers", "Top Losers" and sentiment.
# Kept small and well-known so demo runs stay fast and reliable.
TRACKED_UNIVERSE = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
    "WIPRO", "SBIN", "ITC", "HINDUNILVR", "BAJFINANCE",
    "KOTAKBANK", "LT", "MARUTI", "AXISBANK", "ASIANPAINT",
]

# Indian market indices shown in the Market Overview panel.
MARKET_INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANK NIFTY": "^NSEBANK",
}


def get_stock_data(ticker, period="6mo"):
    stock = yf.Ticker(ticker + ".NS")
    df = stock.history(period=period)

    if df.empty:
        return None

    return df.reset_index()


def predict_stock(ticker):
    df = get_stock_data(ticker)

    if df is None or len(df) < 10:
        return {
            "error": "Not enough data."
        }

    latest = df["Close"].iloc[-1]
    ma5 = df["Close"].rolling(5).mean().iloc[-1]
    ma20 = df["Close"].rolling(20).mean().iloc[-1]

    # Core crossover logic - unchanged from the original implementation
    if ma5 > ma20:
        signal = "BUY"
        confidence = 82
    elif ma5 < ma20:
        signal = "SELL"
        confidence = 78
    else:
        signal = "HOLD"
        confidence = 60

    # --- Enriched fields for the upgraded prediction UI ---
    gap_pct = abs((ma5 - ma20) / ma20 * 100) if ma20 else 0
    recommendation = _recommendation_level(signal, gap_pct)
    risk = _risk_level(df)
    prev_close = df["Close"].iloc[-2] if len(df) > 1 else latest
    day_change_pct = ((latest - prev_close) / prev_close * 100) if prev_close else 0

    return {
        "ticker": ticker.upper(),
        "current_price": round(float(latest), 2),
        "signal": signal,
        "confidence": confidence,
        "ma5": round(float(ma5), 2),
        "ma20": round(float(ma20), 2),
        "recommendation": recommendation,
        "risk": risk,
        "strength": round(float(gap_pct), 2),
        "day_change_pct": round(float(day_change_pct), 2),
    }


def _recommendation_level(signal, gap_pct):
    """Map the raw signal + crossover gap into a 5-level recommendation badge."""
    if signal == "BUY":
        return "STRONG BUY" if gap_pct >= 2 else "BUY"
    if signal == "SELL":
        return "STRONG SELL" if gap_pct >= 2 else "SELL"
    return "HOLD"


def _risk_level(df, window=20):
    """Simple volatility-based risk meter using rolling std of daily returns."""
    returns = df["Close"].pct_change().dropna()
    if returns.empty:
        return {"level": "MEDIUM", "score": 50}

    recent = returns.tail(window)
    volatility = float(recent.std()) * 100  # percent

    if volatility < 1.0:
        return {"level": "LOW", "score": min(100, round(volatility * 30))}
    if volatility < 2.5:
        return {"level": "MEDIUM", "score": min(100, round(30 + volatility * 15))}
    return {"level": "HIGH", "score": min(100, round(50 + volatility * 10))}


def get_market_overview():
    """Fetch current value and % change for tracked indices."""
    overview = []
    for name, symbol in MARKET_INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="5d")
            if df.empty or len(df) < 2:
                overview.append({"name": name, "error": "No data"})
                continue

            latest = float(df["Close"].iloc[-1])
            prev = float(df["Close"].iloc[-2])
            change_pct = ((latest - prev) / prev) * 100 if prev else 0

            overview.append({
                "name": name,
                "value": round(latest, 2),
                "change_pct": round(change_pct, 2),
                "direction": "up" if change_pct >= 0 else "down",
            })
        except Exception:
            overview.append({"name": name, "error": "Unavailable"})

    return overview


def get_movers(limit=5):
    """Compute top gainers and losers across the tracked stock universe."""
    movers = []

    for ticker in TRACKED_UNIVERSE:
        try:
            stock = yf.Ticker(ticker + ".NS")
            df = stock.history(period="5d")
            if df.empty or len(df) < 2:
                continue

            latest = float(df["Close"].iloc[-1])
            prev = float(df["Close"].iloc[-2])
            change_pct = ((latest - prev) / prev) * 100 if prev else 0

            movers.append({
                "ticker": ticker,
                "price": round(latest, 2),
                "change_pct": round(change_pct, 2),
            })
        except Exception:
            continue

    movers.sort(key=lambda m: m["change_pct"], reverse=True)

    gainers = [m for m in movers if m["change_pct"] >= 0][:limit]
    losers = sorted(
        [m for m in movers if m["change_pct"] < 0],
        key=lambda m: m["change_pct"]
    )[:limit]

    return {"gainers": gainers, "losers": losers}


def get_market_sentiment(sample_tickers=None):
    """
    Derive an overall market sentiment (Bullish / Neutral / Bearish) by
    running the existing prediction logic across a basket of stocks and
    aggregating their signals. No external AI APIs are used.
    """
    if sample_tickers is None:
        sample_tickers = TRACKED_UNIVERSE[:10]

    buy_count = 0
    sell_count = 0
    hold_count = 0
    evaluated = 0

    for ticker in sample_tickers:
        result = predict_stock(ticker)
        if "error" in result:
            continue
        evaluated += 1
        if result["signal"] == "BUY":
            buy_count += 1
        elif result["signal"] == "SELL":
            sell_count += 1
        else:
            hold_count += 1

    if evaluated == 0:
        return {"label": "NEUTRAL", "score": 50, "buy": 0, "sell": 0, "hold": 0}

    # Score from 0 (fully bearish) to 100 (fully bullish), 50 = neutral
    score = round(((buy_count - sell_count) / evaluated) * 50 + 50)
    score = max(0, min(100, score))

    if score >= 60:
        label = "BULLISH"
    elif score <= 40:
        label = "BEARISH"
    else:
        label = "NEUTRAL"

    return {
        "label": label,
        "score": score,
        "buy": buy_count,
        "sell": sell_count,
        "hold": hold_count,
    }
