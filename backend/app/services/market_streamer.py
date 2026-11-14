import asyncio
import logging
import random
import time
from typing import Dict, List, Optional
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("TradeAIPilot.Streamer")

# Tickers tracked by the streamer
_TICKERS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL",
    "SBIN", "TATAMOTORS", "ITC", "WIPRO", "BAJFINANCE", "KOTAKBANK",
    "LT", "AXISBANK", "HINDUNILVR", "MARUTI", "ASIANPAINT", "HCLTECH", "LTIM",
]

# Spread sizes per ticker
_SPREADS: Dict[str, float] = {
    "RELIANCE": 0.50, "TCS": 0.50, "HDFCBANK": 0.25, "INFY": 0.25,
    "ICICIBANK": 0.20, "BHARTIARTL": 0.25, "SBIN": 0.15, "TATAMOTORS": 0.20,
    "ITC": 0.10, "WIPRO": 0.10, "BAJFINANCE": 1.00, "KOTAKBANK": 0.30,
    "LT": 0.50, "AXISBANK": 0.20, "HINDUNILVR": 0.50, "MARUTI": 2.00,
    "ASIANPAINT": 0.50, "HCLTECH": 0.25, "LTIM": 1.00,
}

_BASE_VOLUMES: Dict[str, int] = {
    "RELIANCE": 6840000, "TCS": 2150000, "HDFCBANK": 12400000, "INFY": 5420000,
    "ICICIBANK": 8900000, "BHARTIARTL": 3700000, "SBIN": 9210000, "TATAMOTORS": 7820000,
    "ITC": 7100000, "WIPRO": 4150000, "BAJFINANCE": 1200000, "KOTAKBANK": 3100000,
    "LT": 1850000, "AXISBANK": 4500000, "HINDUNILVR": 1400000, "MARUTI": 650000,
    "ASIANPAINT": 1100000, "HCLTECH": 2800000, "LTIM": 850000,
}

# Static index seeds (indices are harder to get from yfinance reliably in real-time)
_INITIAL_INDICES: Dict[str, dict] = {
    "NIFTY 50": {"value": 24345.80, "prev_close": 24200.60},
    "SENSEX": {"value": 79890.15, "prev_close": 79469.65},
    "BANK NIFTY": {"value": 51780.40, "prev_close": 51890.65},
    "NIFTY IT": {"value": 42150.30, "prev_close": 41839.50},
    "INDIA VIX": {"value": 13.45, "prev_close": 13.87},
    "USD / INR": {"value": 84.38, "prev_close": 84.34},
}


def _fetch_real_prices() -> Dict[str, float]:
    """Fetch real current prices from yfinance for all tracked tickers.
    Returns a dict of ticker -> price. Falls back gracefully per-ticker."""
    try:
        import yfinance as yf
        import pandas as pd

        symbols = [f"{t}.NS" for t in _TICKERS]
        logger.info("MarketStreamer: fetching real prices from yfinance for %d tickers...", len(symbols))
        data = yf.download(
            tickers=symbols,
            period="2d",
            interval="1d",
            group_by="ticker",
            threads=True,
            progress=False,
            auto_adjust=True,
        )

        prices: Dict[str, float] = {}
        for ticker in _TICKERS:
            sym = f"{ticker}.NS"
            try:
                if isinstance(data.columns, pd.MultiIndex):
                    if sym in data.columns.get_level_values(0):
                        close_col = data[sym]["Close"].dropna()
                        if not close_col.empty:
                            prices[ticker] = round(float(close_col.iloc[-1]), 2)
                            continue
                else:
                    close_col = data["Close"].dropna()
                    if not close_col.empty:
                        prices[ticker] = round(float(close_col.iloc[-1]), 2)
                        continue
            except Exception:
                pass
            # Per-ticker fallback: try individually
            try:
                stock = yf.Ticker(sym)
                df = stock.history(period="2d")
                if not df.empty:
                    prices[ticker] = round(float(df["Close"].iloc[-1]), 2)
                    continue
            except Exception:
                pass

        logger.info("MarketStreamer: fetched real prices for %d / %d tickers", len(prices), len(_TICKERS))
        return prices
    except Exception as e:
        logger.warning("MarketStreamer: yfinance batch fetch failed (%s), using fallbacks", e)
        return {}


class MarketStreamer:
    """Streams realistic high-frequency tick data seeded with REAL yfinance prices.
    Prices are anchored to the actual market price at startup, then micro-ticked
    realistically within ±8% intraday bands around that real open price.
    """

    def __init__(self):
        self.stocks: Dict[str, dict] = {}
        self.indices: Dict[str, dict] = {}
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._init_state()

    def _init_state(self):
        # --- Seed stock prices from REAL yfinance data ---
        real_prices = _fetch_real_prices()

        from app.services.market_data import FALLBACK_PRICES  # import here to avoid circular at module load

        for ticker in _TICKERS:
            spread = _SPREADS.get(ticker, 0.25)
            base_vol = _BASE_VOLUMES.get(ticker, 2000000)

            # Use real price; fall back to FALLBACK_PRICES if yfinance failed for this ticker
            price = real_prices.get(ticker) or FALLBACK_PRICES.get(ticker, 1500.0)

            # Estimate prev_close as ~0.5-1% below current (we don't have yesterday's close
            # from the batch download easily, so approximate it)
            prev = round(price * random.uniform(0.990, 1.005), 2)

            self.stocks[ticker] = {
                "ticker": ticker,
                "price": price,
                "open": round(prev * (1.0 + random.uniform(-0.003, 0.004)), 2),
                "high": round(price * 1.004, 2),
                "low": round(price * 0.996, 2),
                "prev_close": prev,
                "change": round(price - prev, 2),
                "change_pct": round(((price - prev) / prev) * 100, 2),
                "volume": base_vol,
                "bid": round(price - spread / 2, 2),
                "ask": round(price + spread / 2, 2),
                "spread": spread,
                "direction": "up" if price >= prev else "down",
            }

        logger.info(
            "MarketStreamer: initialized with real prices. Sample — RELIANCE: ₹%s, TCS: ₹%s",
            self.stocks.get("RELIANCE", {}).get("price", "N/A"),
            self.stocks.get("TCS", {}).get("price", "N/A"),
        )

        # --- Seed indices (static seed, then streamed) ---
        for name, data in _INITIAL_INDICES.items():
            val = data["value"]
            prev = data["prev_close"]
            chg = round(val - prev, 2)
            pct = round((chg / prev) * 100, 2)
            self.indices[name] = {
                "name": name,
                "value": val,
                "prev_close": prev,
                "change": chg,
                "change_pct": pct,
                "direction": "up" if chg >= 0 else "down",
            }

    def generate_depth(self, ticker: str) -> dict:
        """Generates realistic 5-level Indian stock depth for a given ticker."""
        stock = self.stocks.get(ticker.upper())
        if not stock:
            return {"bids": [], "asks": []}

        price = stock["price"]
        spread = stock["spread"]
        tick_size = 0.05 if price < 1000 else (0.10 if price < 3000 else 0.25)

        best_bid = round(price - spread / 2, 2)
        best_ask = round(price + spread / 2, 2)

        bids = []
        asks = []

        for i in range(5):
            b_price = round(best_bid - (i * tick_size * random.uniform(1.0, 2.5)), 2)
            b_qty = int(random.randint(400, 4800) * (1 + (i * 0.35)))
            b_orders = int(random.randint(6, 45) + (i * 3))
            bids.append({"price": b_price, "qty": b_qty, "orders": b_orders})

            a_price = round(best_ask + (i * tick_size * random.uniform(1.0, 2.5)), 2)
            a_qty = int(random.randint(400, 4800) * (1 + (i * 0.35)))
            a_orders = int(random.randint(6, 45) + (i * 3))
            asks.append({"price": a_price, "qty": a_qty, "orders": a_orders})

        return {"ticker": ticker.upper(), "bids": bids, "asks": asks}

    def get_snapshot(self) -> dict:
        """Returns instantaneous snapshot of all stocks and indices."""
        return {
            "stocks": list(self.stocks.values()),
            "indices": list(self.indices.values()),
            "timestamp": int(time.time() * 1000),
        }

    async def _tick_stock(self, ticker: str):
        st = self.stocks[ticker]
        old_price = st["price"]
        spread = st["spread"]

        # Realistic tick variation (±0.06% micro-movement with slight upward bias)
        pct_delta = random.gauss(0.00005, 0.0006)
        tick_increment = 0.05 if old_price < 1000 else (0.10 if old_price < 3000 else 0.25)

        raw_price = old_price * (1.0 + pct_delta)
        # Snap to valid tick size
        new_price = round(round(raw_price / tick_increment) * tick_increment, 2)

        # Prevent runaway drift beyond intraday bands (±8% from open)
        open_price = st["open"]
        if new_price > open_price * 1.08:
            new_price = round(open_price * 1.08, 2)
        elif new_price < open_price * 0.92:
            new_price = round(open_price * 0.92, 2)

        # Update high, low, volume, direction
        st["high"] = max(st["high"], new_price)
        st["low"] = min(st["low"], new_price)
        st["volume"] += random.randint(100, 4500)

        direction = "up" if new_price > old_price else ("down" if new_price < old_price else st["direction"])
        st["direction"] = direction
        st["price"] = new_price
        st["bid"] = round(new_price - spread / 2, 2)
        st["ask"] = round(new_price + spread / 2, 2)

        prev = st["prev_close"]
        chg = round(new_price - prev, 2)
        pct = round((chg / prev) * 100, 2)
        st["change"] = chg
        st["change_pct"] = pct

        payload = {
            "type": "TICK",
            "data": {
                "ticker": ticker,
                "price": new_price,
                "open": st["open"],
                "high": st["high"],
                "low": st["low"],
                "change": chg,
                "change_pct": pct,
                "volume": st["volume"],
                "bid": st["bid"],
                "ask": st["ask"],
                "direction": direction,
                "timestamp": int(time.time() * 1000),
            },
        }

        # Broadcast tick
        await ws_manager.broadcast_json(payload, ticker=ticker)

        # Occasionally broadcast updated L2 depth for this ticker (35% chance on tick)
        if random.random() < 0.35:
            depth_payload = {
                "type": "DEPTH",
                "data": self.generate_depth(ticker),
            }
            await ws_manager.broadcast_json(depth_payload, ticker=ticker)

    async def _tick_index(self, name: str):
        idx = self.indices[name]
        old_val = idx["value"]
        pct_delta = random.gauss(0.00002, 0.0003)
        new_val = round(old_val * (1.0 + pct_delta), 2)
        prev = idx["prev_close"]
        chg = round(new_val - prev, 2)
        pct = round((chg / prev) * 100, 2)
        direction = "up" if new_val >= old_val else "down"

        idx["value"] = new_val
        idx["change"] = chg
        idx["change_pct"] = pct
        idx["direction"] = direction

        payload = {
            "type": "INDEX_TICK",
            "data": {
                "name": name,
                "value": new_val,
                "change": chg,
                "change_pct": pct,
                "direction": direction,
                "timestamp": int(time.time() * 1000),
            },
        }
        await ws_manager.broadcast_json(payload)

    async def _stream_loop(self):
        logger.info("Market streaming engine background loop started.")
        heartbeat_counter = 0
        stock_tickers = list(self.stocks.keys())
        index_names = list(self.indices.keys())

        # Give heavier weight to popular tickers
        priority_tickers = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "TATAMOTORS"]

        while self.is_running:
            try:
                # If no clients are connected, sleep to conserve resources
                if not ws_manager.active_connections:
                    await asyncio.sleep(1.0)
                    continue

                # Pick 1-2 priority stocks + 1 random other stock
                selected_stocks = set()
                selected_stocks.add(random.choice(priority_tickers))
                if random.random() > 0.4:
                    selected_stocks.add(random.choice(priority_tickers))
                selected_stocks.add(random.choice(stock_tickers))

                for ticker in selected_stocks:
                    await self._tick_stock(ticker)

                # Periodically tick one index
                if random.random() > 0.45:
                    idx_name = random.choice(index_names)
                    await self._tick_index(idx_name)

                # Heartbeat every ~15 seconds (approx 25 cycles of 600ms)
                heartbeat_counter += 1
                if heartbeat_counter >= 25:
                    heartbeat_counter = 0
                    await ws_manager.broadcast_json({
                        "type": "HEARTBEAT",
                        "timestamp": int(time.time() * 1000),
                        "active_clients": len(ws_manager.active_connections),
                    })

                # Stream tick cadence: 550ms - 750ms for realistic high-frequency market feel
                await asyncio.sleep(random.uniform(0.55, 0.75))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in market stream loop: {e}")
                await asyncio.sleep(1.0)

        logger.info("Market streaming engine loop stopped.")

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._stream_loop())
            logger.info("MarketStreamer initialized and task scheduled.")

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("MarketStreamer task cancelled.")


market_streamer = MarketStreamer()
