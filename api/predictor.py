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

import time
from threading import Lock
import yfinance as yf
import pandas as pd


class TTLCache:
    """Thread-safe in-memory cache with time-to-live expiration."""
    def __init__(self, default_ttl=60):
        self.default_ttl = default_ttl
        self.cache = {}
        self.lock = Lock()

    def get(self, key):
        with self.lock:
            if key in self.cache:
                val, expiry = self.cache[key]
                if time.time() < expiry:
                    return val
                del self.cache[key]
            return None

    def set(self, key, value, ttl=None):
        with self.lock:
            expiry = time.time() + (ttl if ttl is not None else self.default_ttl)
            self.cache[key] = (value, expiry)

    def clear(self):
        with self.lock:
            self.cache.clear()


market_cache = TTLCache(default_ttl=60)

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
    ticker = ticker.strip().upper()
    cache_key = f"stock_data:{ticker}:{period}"
    cached = market_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        stock = yf.Ticker(ticker + ".NS")
        df = stock.history(period=period)

        if df.empty:
            return None

        result = df.reset_index()
        market_cache.set(cache_key, result, ttl=45)
        return result
    except Exception:
        return None


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
    cached = market_cache.get("market_overview")
    if cached is not None:
        return cached

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

    market_cache.set("market_overview", overview, ttl=60)
    return overview


def get_movers(limit=5):
    """Compute top gainers and losers across the tracked stock universe."""
    cache_key = f"movers:{limit}"
    cached = market_cache.get(cache_key)
    if cached is not None:
        return cached

    movers = []
    # Fast parallel batch download for all 15 symbols
    symbols = [f"{ticker}.NS" for ticker in TRACKED_UNIVERSE]
    try:
        data = yf.download(
            tickers=symbols,
            period="5d",
            interval="1d",
            group_by="ticker",
            threads=True,
            progress=False,
        )
        for ticker in TRACKED_UNIVERSE:
            try:
                sym = f"{ticker}.NS"
                sub = None
                if isinstance(data.columns, pd.MultiIndex):
                    if sym in data.columns.levels[0]:
                        sub = data[sym]["Close"].dropna()
                elif sym in data:
                    sub = data[sym]["Close"].dropna()

                if sub is not None and len(sub) >= 2:
                    latest = float(sub.iloc[-1])
                    prev = float(sub.iloc[-2])
                    change_pct = ((latest - prev) / prev) * 100 if prev else 0
                    movers.append({
                        "ticker": ticker,
                        "price": round(latest, 2),
                        "change_pct": round(change_pct, 2),
                    })
            except Exception:
                continue
    except Exception:
        pass

    # Fallback to individual history if batch download returned empty
    if len(movers) < 3:
        for ticker in TRACKED_UNIVERSE[:6]:
            try:
                stock = yf.Ticker(ticker + ".NS")
                df = stock.history(period="5d")
                if not df.empty and len(df) >= 2:
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
    losers = sorted([m for m in movers if m["change_pct"] < 0], key=lambda m: m["change_pct"])[:limit]

    result = {"gainers": gainers, "losers": losers}
    market_cache.set(cache_key, result, ttl=60)
    return result


def get_market_sentiment(sample_tickers=None):
    """
    Derive an overall market sentiment (Bullish / Neutral / Bearish) by
    running the existing prediction logic across a basket of stocks and
    aggregating their signals.
    """
    if sample_tickers is None:
        sample_tickers = TRACKED_UNIVERSE[:8]

    cache_key = f"sentiment:{','.join(sample_tickers)}"
    cached = market_cache.get(cache_key)
    if cached is not None:
        return cached

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

    result = {
        "label": label,
        "score": score,
        "buy": buy_count,
        "sell": sell_count,
        "hold": hold_count,
    }
    market_cache.set(cache_key, result, ttl=60)
    return result
