import asyncio
import datetime
import logging
import random
import time
from typing import Dict, List, Optional, Any
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

# Major Indian indices (actual current baseline)
_INITIAL_INDICES: Dict[str, dict] = {
    "NIFTY 50": {"value": 25144.30, "prev_close": 25299.35},
    "SENSEX": {"value": 81592.45, "prev_close": 81911.01},
    "BANK NIFTY": {"value": 61034.10, "prev_close": 61518.50},
    "NIFTY IT": {"value": 42150.30, "prev_close": 41839.50},
    "INDIA VIX": {"value": 15.50, "prev_close": 16.59},
    "USD / INR": {"value": 84.38, "prev_close": 84.34},
}


def is_indian_market_open() -> bool:
    """Check if Indian Equities Market (NSE/BSE) is currently in trading session.
    Trading hours: Monday-Friday, 09:15 to 15:30 IST (UTC+5:30)."""
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    # Saturday (5) or Sunday (6)
    if ist_now.weekday() >= 5:
        return False
    market_open = datetime.time(9, 15)
    market_close = datetime.time(15, 30)
    current_time = ist_now.time()
    return market_open <= current_time <= market_close


def _fetch_real_prices_sync() -> Dict[str, Any]:
    """Fetch real current prices and indices from Yahoo Finance fast_info in parallel.
    Run in an executor thread so it never blocks the async event loop."""
    import concurrent.futures
    import yfinance as yf

    stock_quotes: Dict[str, dict] = {}

    def fetch_stock(ticker: str):
        candidates = [f"{ticker}.NS"]
        if ticker == "TATAMOTORS":
            candidates.append("TMPV.NS")

        for sym in candidates:
            try:
                t = yf.Ticker(sym)
                fi = t.fast_info
                lp = round(float(fi['last_price']), 2)
                pc = round(float(fi['previous_close']), 2)
                if lp > 0:
                    hi = round(float(fi['day_high']), 2) if 'day_high' in fi and fi['day_high'] else lp
                    lo = round(float(fi['day_low']), 2) if 'day_low' in fi and fi['day_low'] else lp
                    vo = int(fi['last_volume']) if 'last_volume' in fi and fi['last_volume'] else 2000000
                    op = round(float(fi['open']), 2) if 'open' in fi and fi['open'] else pc
                    chg = round(lp - pc, 2)
                    pct = round((chg / pc) * 100, 2) if pc else 0.0
                    return ticker, {
                        "price": lp,
                        "prev_close": pc,
                        "open": op,
                        "high": hi,
                        "low": lo,
                        "volume": vo,
                        "change": chg,
                        "change_pct": pct,
                    }
            except Exception:
                continue
        return ticker, None

    def fetch_index(name: str, sym: str):
        try:
            t = yf.Ticker(sym)
            fi = t.fast_info
            lp = round(float(fi['last_price']), 2)
            pc = round(float(fi['previous_close']), 2)
            if lp > 0:
                chg = round(lp - pc, 2)
                pct = round((chg / pc) * 100, 2) if pc else 0.0
                return name, {"value": lp, "prev_close": pc, "change": chg, "change_pct": pct}
        except Exception:
            pass
        return name, None

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            stock_futures = [ex.submit(fetch_stock, t) for t in _TICKERS]
            index_futures = [
                ex.submit(fetch_index, "NIFTY 50", "^NSEI"),
                ex.submit(fetch_index, "SENSEX", "^BSESN"),
                ex.submit(fetch_index, "BANK NIFTY", "^NSEBANK"),
                ex.submit(fetch_index, "INDIA VIX", "^INDIAVIX"),
            ]

            for f in concurrent.futures.as_completed(stock_futures):
                ticker, res = f.result()
                if res:
                    stock_quotes[ticker] = res

            index_quotes = {}
            for f in concurrent.futures.as_completed(index_futures):
                name, res = f.result()
                if res:
                    index_quotes[name] = res

        return {"stocks": stock_quotes, "indices": index_quotes}
    except Exception as e:
        logger.warning("MarketStreamer: parallel fast_info sync failed (%s)", e)
        return {"stocks": {}, "indices": {}}


class MarketStreamer:
    """Streams high-frequency real-time tick data for Indian equities and indices.
    Initializes immediately without blocking import, and dynamically anchors to
    real Yahoo Finance quotes in the background.
    """

    def __init__(self):
        self.stocks: Dict[str, dict] = {}
        self.indices: Dict[str, dict] = {}
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._init_state()

    def _init_state(self):
        # Import FALLBACK_PRICES immediately (zero latency, non-blocking on startup)
        from app.services.market_data import FALLBACK_PRICES

        for ticker in _TICKERS:
            spread = _SPREADS.get(ticker, 0.25)
            base_vol = _BASE_VOLUMES.get(ticker, 2000000)
            price = FALLBACK_PRICES.get(ticker, 1500.0)
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

        # Initialize indices
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

    async def _async_sync_real_prices(self):
        """Asynchronously sync real prices and indices in thread pool without blocking event loop."""
        try:
            data = await asyncio.to_thread(_fetch_real_prices_sync)
            stock_quotes = data.get("stocks", {})
            index_quotes = data.get("indices", {})

            for ticker, q in stock_quotes.items():
                if ticker in self.stocks:
                    st = self.stocks[ticker]
                    spread = st["spread"]
                    st["price"] = q["price"]
                    st["prev_close"] = q["prev_close"]
                    st["open"] = q["open"]
                    st["high"] = max(st["high"], q["high"])
                    st["low"] = min(st["low"], q["low"])
                    st["volume"] = max(st["volume"], q["volume"])
                    st["change"] = q["change"]
                    st["change_pct"] = q["change_pct"]
                    st["bid"] = round(q["price"] - spread / 2, 2)
                    st["ask"] = round(q["price"] + spread / 2, 2)
                    st["direction"] = "up" if q["change"] >= 0 else "down"

            for name, q in index_quotes.items():
                if name in self.indices:
                    idx = self.indices[name]
                    idx["value"] = q["value"]
                    idx["prev_close"] = q["prev_close"]
                    idx["change"] = q["change"]
                    idx["change_pct"] = q["change_pct"]
                    idx["direction"] = "up" if q["change"] >= 0 else "down"

            if stock_quotes:
                logger.info("MarketStreamer: live prices updated to current real market quotes (%d stocks, %d indices).", len(stock_quotes), len(index_quotes))
        except Exception as e:
            logger.warning("MarketStreamer: failed async price sync: %s", e)

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
        """Returns instantaneous snapshot of all stocks, indices and market hours status."""
        return {
            "stocks": list(self.stocks.values()),
            "indices": list(self.indices.values()),
            "market_open": is_indian_market_open(),
            "timestamp": int(time.time() * 1000),
        }

    async def _tick_stock(self, ticker: str):
        st = self.stocks[ticker]
        spread = st["spread"]
        market_open = is_indian_market_open()

        if market_open:
            old_price = st["price"]
            # Realistic tick variation (micro-movement tightly bounded around live quote)
            pct_delta = random.gauss(0.00001, 0.0002)
            tick_increment = 0.05 if old_price < 1000 else (0.10 if old_price < 3000 else 0.25)

            raw_price = old_price * (1.0 + pct_delta)
            new_price = round(round(raw_price / tick_increment) * tick_increment, 2)

            # Prevent drift beyond +/- 3% from real baseline
            anchor = st["prev_close"] or old_price
            if abs(new_price - anchor) / anchor > 0.03:
                new_price = old_price

            st["high"] = max(st["high"], new_price)
            st["low"] = min(st["low"], new_price)
            st["volume"] += random.randint(50, 900)

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
        else:
            # Market Closed: Pin to actual real closing exchange price (never drift)
            new_price = st["price"]
            direction = st["direction"]
            chg = st["change"]
            pct = st["change_pct"]

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

        # Occasionally broadcast updated L2 depth for this ticker (30% chance on tick)
        if random.random() < 0.30:
            depth_payload = {
                "type": "DEPTH",
                "data": self.generate_depth(ticker),
            }
            await ws_manager.broadcast_json(depth_payload, ticker=ticker)

    async def _tick_index(self, name: str):
        idx = self.indices[name]
        market_open = is_indian_market_open()

        if market_open:
            old_val = idx["value"]
            pct_delta = random.gauss(0.00001, 0.0002)
            new_val = round(old_val * (1.0 + pct_delta), 2)
            prev = idx["prev_close"]
            chg = round(new_val - prev, 2)
            pct = round((chg / prev) * 100, 2)
            direction = "up" if new_val >= old_val else "down"

            idx["value"] = new_val
            idx["change"] = chg
            idx["change_pct"] = pct
            idx["direction"] = direction
        else:
            # Market Closed: Pin to real closing value
            new_val = idx["value"]
            chg = idx["change"]
            pct = idx["change_pct"]
            direction = idx["direction"]

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
        sync_counter = 0
        stock_tickers = list(self.stocks.keys())
        index_names = list(self.indices.keys())

        # Give heavier weight to popular tickers
        priority_tickers = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL"]

        # Run an initial asynchronous sync with real quotes right as stream loop starts
        asyncio.create_task(self._async_sync_real_prices())

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

                # Periodic resync with real quotes every ~25 seconds (approx 35 loops)
                sync_counter += 1
                if sync_counter >= 35:
                    sync_counter = 0
                    asyncio.create_task(self._async_sync_real_prices())

                # Heartbeat every ~15 seconds (approx 25 cycles of 600ms)
                heartbeat_counter += 1
                if heartbeat_counter >= 25:
                    heartbeat_counter = 0
                    await ws_manager.broadcast_json({
                        "type": "HEARTBEAT",
                        "market_open": is_indian_market_open(),
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
