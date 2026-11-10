from abc import ABC, abstractmethod
from typing import Dict, List, Optional
import pandas as pd
import yfinance as yf

from app.core.cache import market_cache


# Default tracked universe of top liquid Indian large-caps (NSE)
TRACKED_UNIVERSE = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
    "WIPRO", "SBIN", "ITC", "HINDUNILVR", "BAJFINANCE",
    "KOTAKBANK", "LT", "MARUTI", "AXISBANK", "ASIANPAINT",
]

MARKET_INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANK NIFTY": "^NSEBANK",
}


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
    """High-speed yfinance provider with thread-safe TTL caching and batch parallel downloading."""

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
                return None
            price = round(float(df["Close"].iloc[-1]), 2)
            return price
        except Exception:
            return None

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
                return None
            df_reset = df.reset_index()
            self.cache.set(cache_key, df_reset, ttl=45)
            return df_reset
        except Exception:
            return None

    def get_movers(self, limit: int = 5) -> Dict[str, List[dict]]:
        cache_key = f"market:movers:{limit}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        movers = []
        symbols = [self._normalize_ticker(t) for t in TRACKED_UNIVERSE]

        try:
            # Single multi-threaded batch download for all 15 symbols
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
                    elif sym in data:
                        sub = data[sym]["Close"].dropna()

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

        # Fallback if batch download failed
        if len(movers) < 3:
            for ticker in TRACKED_UNIVERSE[:6]:
                try:
                    df = self.get_history(ticker, period="5d")
                    if df is not None and len(df) >= 2:
                        latest = float(df["Close"].iloc[-1])
                        prev = float(df["Close"].iloc[-2])
                        change_pct = ((latest - prev) / prev) * 100 if prev else 0.0
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
                    overview.append({"name": name, "error": "No data"})
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
                overview.append({"name": name, "error": "Unavailable"})

        self.cache.set("market:overview", overview, ttl=self.cache_ttl)
        return overview


# Instantiate default market data provider
market_service = CachedYFinanceProvider()

