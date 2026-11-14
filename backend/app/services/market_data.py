from abc import ABC, abstractmethod
import datetime
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
import yfinance as yf

from app.core.cache import market_cache


# Default tracked universe of top liquid Indian large-caps (NSE)
TRACKED_UNIVERSE = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
    "WIPRO", "SBIN", "ITC", "HINDUNILVR", "BAJFINANCE",
    "KOTAKBANK", "LT", "MARUTI", "AXISBANK", "ASIANPAINT",
    "TATAMOTORS",
]

MARKET_INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANK NIFTY": "^NSEBANK",
}

# Last-resort fallback prices (used only if yfinance is unavailable).
# Update periodically but these are never shown when network is healthy.
FALLBACK_PRICES: Dict[str, float] = {
    "RELIANCE": 1330.00,
    "TCS": 3700.00,
    "INFY": 1550.00,
    "HDFCBANK": 1750.00,
    "ICICIBANK": 1270.00,
    "TATAMOTORS": 790.00,
    "SBIN": 820.00,
    "ITC": 460.00,
    "WIPRO": 560.00,
    "BAJFINANCE": 6800.00,
    "KOTAKBANK": 1850.00,
    "LT": 3650.00,
    "AXISBANK": 1180.00,
    "HINDUNILVR": 2400.00,
    "MARUTI": 11200.00,
    "ASIANPAINT": 2300.00,
    "HCLTECH": 1800.00,
    "LTIM": 5700.00,
    "BHARTIARTL": 1600.00,
}

FALLBACK_INDICES = [
    {"name": "NIFTY 50", "value": 24345.80, "change_pct": 0.60, "direction": "up"},
    {"name": "SENSEX", "value": 79890.15, "change_pct": 0.53, "direction": "up"},
    {"name": "BANK NIFTY", "value": 51780.40, "change_pct": -0.21, "direction": "down"},
]


def generate_fallback_df(ticker: str, count: int = 120) -> pd.DataFrame:
    base = FALLBACK_PRICES.get(ticker, 1500.0)
    dates = [datetime.date.today() - datetime.timedelta(days=i) for i in range(count * 2, 0, -1)]
    dates = [d for d in dates if d.weekday() < 5][-count:]

    opens, highs, lows, closes, volumes = [], [], [], [], []
    price = base * 0.88

    for _ in dates:
        intraday_pct = float(np.random.normal(0.0005, 0.016))
        open_price = price * (1.0 + float(np.random.normal(0, 0.003)))
        close_price = open_price * (1.0 + intraday_pct)

        high_price = max(open_price, close_price) * (1.0 + abs(float(np.random.normal(0.002, 0.005))))
        low_price = min(open_price, close_price) * (1.0 - abs(float(np.random.normal(0.002, 0.005))))

        opens.append(round(open_price, 2))
        closes.append(round(close_price, 2))
        highs.append(round(high_price, 2))
        lows.append(round(low_price, 2))
        volumes.append(int(np.random.randint(600000, 3200000)))

        price = close_price

    # Anchor the most recent candle to the current reference market price
    closes[-1] = base
    highs[-1] = max(highs[-1], base)
    lows[-1] = min(lows[-1], base)

    df = pd.DataFrame({
        "Date": pd.to_datetime(dates),
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": closes,
        "Volume": volumes,
    })
    return df


class BaseMarketDataProvider(ABC):
    """Abstract interface for market data providers (yfinance now, Zerodha/Upstox later)."""

    @abstractmethod
    def get_live_price(self, ticker: str) -> Optional[float]:
        pass

    @abstractmethod
    def get_history(self, ticker: str, period: str = "1mo") -> Optional[pd.DataFrame]:
        pass

    @abstractmethod
    def get_movers(self, limit: int = 5) -> Dict[str, List[dict]]:
        pass

    @abstractmethod
    def get_market_overview(self) -> List[dict]:
        pass


class CachedYFinanceProvider(BaseMarketDataProvider):
    """High-speed yfinance provider with thread-safe TTL caching, fallback resilience, and batching."""

    def __init__(self, cache_ttl: int = 60):
        self.cache = market_cache
        self.cache_ttl = cache_ttl

    def _normalize_ticker(self, ticker: str) -> str:
        t = ticker.strip().upper()
        return t if t.endswith(".NS") or t.startswith("^") else f"{t}.NS"

    def get_live_price(self, ticker: str) -> Optional[float]:
        clean_ticker = ticker.strip().upper().replace(".NS", "")
        # Check cache from recent stock data requests first
        for period in ("1d", "5d", "1mo", "6mo"):
            cached = self.cache.get(f"stock_data:{clean_ticker}:{period}")
            if cached is not None and not cached.empty:
                return round(float(cached["Close"].iloc[-1]), 2)

        try:
            sym = self._normalize_ticker(ticker)
            stock = yf.Ticker(sym)
            df = stock.history(period="1d")
            if df.empty:
                df = stock.history(period="5d")
            if df.empty:
                return FALLBACK_PRICES.get(clean_ticker, 1500.0)
            price = round(float(df["Close"].iloc[-1]), 2)
            return price
        except Exception:
            return FALLBACK_PRICES.get(clean_ticker, 1500.0)

    def get_history(self, ticker: str, period: str = "1mo") -> Optional[pd.DataFrame]:
        clean_ticker = ticker.strip().upper().replace(".NS", "")
        cache_key = f"stock_data:{clean_ticker}:{period}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            sym = self._normalize_ticker(ticker)
            stock = yf.Ticker(sym)
            df = stock.history(period=period)
            if df.empty:
                df_fallback = generate_fallback_df(clean_ticker)
                self.cache.set(cache_key, df_fallback, ttl=60)
                return df_fallback
            df_reset = df.reset_index()
            self.cache.set(cache_key, df_reset, ttl=45)
            return df_reset
        except Exception:
            df_fallback = generate_fallback_df(clean_ticker)
            self.cache.set(cache_key, df_fallback, ttl=60)
            return df_fallback

    def get_movers(self, limit: int = 5) -> Dict[str, List[dict]]:
        cache_key = f"market:movers:{limit}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        movers = []
        symbols = [self._normalize_ticker(t) for t in TRACKED_UNIVERSE]

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
                sym = self._normalize_ticker(ticker)
                try:
                    sub = None
                    if isinstance(data.columns, pd.MultiIndex):
                        if sym in data.columns.levels[0]:
                            sub = data[sym]["Close"].dropna()
                    else:
                        sub = data["Close"].dropna()

                    if sub is not None and len(sub) >= 2:
                        latest = float(sub.iloc[-1])
                        prev = float(sub.iloc[-2])
                        change_pct = ((latest - prev) / prev) * 100 if prev else 0.0
                        movers.append({
                            "ticker": ticker,
                            "price": round(latest, 2),
                            "change_pct": round(change_pct, 2),
                        })
                except Exception:
                    continue
        except Exception:
            pass

        # If download failed or returned too few items, build from fallback prices
        # if len(movers) < 4:
        #     movers = [
        #         {"ticker": "RELIANCE", "price": 2984.50, "change_pct": 1.30},
        #         {"ticker": "TATAMOTORS", "price": 988.40, "change_pct": 1.29},
        #         {"ticker": "INFY", "price": 1865.10, "change_pct": 1.24},
        #         {"ticker": "ICICIBANK", "price": 1268.90, "change_pct": 1.16},
        #         {"ticker": "TCS", "price": 4120.75, "change_pct": 1.11},
        #         {"ticker": "HDFCBANK", "price": 1742.30, "change_pct": -0.48},
        #         {"ticker": "SBIN", "price": 818.40, "change_pct": -0.50},
        #         {"ticker": "AXISBANK", "price": 1195.40, "change_pct": -0.65},
        #         {"ticker": "WIPRO", "price": 564.30, "change_pct": -0.37},
        #     ]

        movers.sort(key=lambda m: m["change_pct"], reverse=True)
        gainers = [m for m in movers if m["change_pct"] >= 0][:limit]
        losers = sorted([m for m in movers if m["change_pct"] < 0], key=lambda m: m["change_pct"])[:limit]

        result = {"gainers": gainers, "losers": losers}
        self.cache.set(cache_key, result, ttl=self.cache_ttl)
        return result

    def get_market_overview(self) -> List[dict]:
        cached = self.cache.get("market:overview")
        if cached is not None:
            return cached

        overview = []
        for name, symbol in MARKET_INDICES.items():
            try:
                stock = yf.Ticker(symbol)
                df = stock.history(period="5d")
                if df.empty or len(df) < 2:
                    # Use fallback index data
                    fb = next((item for item in FALLBACK_INDICES if item["name"] == name), None)
                    if fb:
                        overview.append(fb)
                    else:
                        overview.append({"name": name, "value": 24000.0, "change_pct": 0.5, "direction": "up"})
                    continue

                latest = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2])
                change_pct = ((latest - prev) / prev) * 100 if prev else 0.0

                overview.append({
                    "name": name,
                    "value": round(latest, 2),
                    "change_pct": round(change_pct, 2),
                    "direction": "up" if change_pct >= 0 else "down",
                })
            except Exception:
                fb = next((item for item in FALLBACK_INDICES if item["name"] == name), None)
                if fb:
                    overview.append(fb)
                else:
                    overview.append({"name": name, "value": 24000.0, "change_pct": 0.5, "direction": "up"})

        self.cache.set("market:overview", overview, ttl=self.cache_ttl)
        return overview


# Instantiate default market data provider
market_service = CachedYFinanceProvider()
