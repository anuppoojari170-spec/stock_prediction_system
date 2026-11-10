import asyncio
import datetime
import logging
import random
import time
from typing import Dict, List, Optional
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("TradeAIPilot.Streamer")

# Reference base prices for Indian equities (NSE)
INITIAL_STOCK_STATE: Dict[str, dict] = {
    "RELIANCE": {"price": 2984.50, "prev_close": 2946.30, "volume": 6840000, "spread": 0.50},
    "TCS": {"price": 4120.75, "prev_close": 4075.45, "volume": 2150000, "spread": 0.50},
    "HDFCBANK": {"price": 1742.30, "prev_close": 1750.70, "volume": 12400000, "spread": 0.25},
    "INFY": {"price": 1865.10, "prev_close": 1842.30, "volume": 5420000, "spread": 0.25},
    "ICICIBANK": {"price": 1268.90, "prev_close": 1254.40, "volume": 8900000, "spread": 0.20},
    "BHARTIARTL": {"price": 1595.60, "prev_close": 1589.40, "volume": 3700000, "spread": 0.25},
    "SBIN": {"price": 818.40, "prev_close": 822.50, "volume": 9210000, "spread": 0.15},
    "TATAMOTORS": {"price": 988.40, "prev_close": 975.80, "volume": 7820000, "spread": 0.20},
    "ITC": {"price": 476.85, "prev_close": 474.90, "volume": 7100000, "spread": 0.10},
    "WIPRO": {"price": 564.30, "prev_close": 566.40, "volume": 4150000, "spread": 0.10},
    "BAJFINANCE": {"price": 6920.00, "prev_close": 6850.00, "volume": 1200000, "spread": 1.00},
    "KOTAKBANK": {"price": 1785.20, "prev_close": 1779.60, "volume": 3100000, "spread": 0.30},
    "LT": {"price": 3640.00, "prev_close": 3610.00, "volume": 1850000, "spread": 0.50},
    "AXISBANK": {"price": 1195.40, "prev_close": 1203.20, "volume": 4500000, "spread": 0.20},
    "HINDUNILVR": {"price": 2480.00, "prev_close": 2492.00, "volume": 1400000, "spread": 0.50},
    "MARUTI": {"price": 11450.00, "prev_close": 11380.00, "volume": 650000, "spread": 2.00},
    "ASIANPAINT": {"price": 2890.00, "prev_close": 2875.00, "volume": 1100000, "spread": 0.50},
    "HCLTECH": {"price": 1824.60, "prev_close": 1806.20, "volume": 2800000, "spread": 0.25},
    "LTIM": {"price": 5940.00, "prev_close": 5855.00, "volume": 850000, "spread": 1.00},
}

INITIAL_INDICES: Dict[str, dict] = {
    "NIFTY 50": {"value": 24345.80, "prev_close": 24200.60},
    "SENSEX": {"value": 79890.15, "prev_close": 79469.65},
    "BANK NIFTY": {"value": 51780.40, "prev_close": 51890.65},
    "NIFTY IT": {"value": 42150.30, "prev_close": 41839.50},
    "INDIA VIX": {"value": 13.45, "prev_close": 13.87},
    "USD / INR": {"value": 84.38, "prev_close": 84.34},
}


class MarketStreamer:
    """Simulates realistic high-frequency market data streaming and L2 Order Book depth."""

    def __init__(self):
        self.stocks: Dict[str, dict] = {}
        self.indices: Dict[str, dict] = {}
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._init_state()

    def _init_state(self):
        for ticker, data in INITIAL_STOCK_STATE.items():
            price = data["price"]
            prev = data["prev_close"]
            spread = data["spread"]
            self.stocks[ticker] = {
                "ticker": ticker,
                "price": price,
                "open": round(prev * (1.0 + random.uniform(-0.003, 0.004)), 2),
                "high": round(price * 1.008, 2),
                "low": round(price * 0.992, 2),
                "prev_close": prev,
                "change": round(price - prev, 2),
                "change_pct": round(((price - prev) / prev) * 100, 2),
                "volume": data["volume"],
                "bid": round(price - spread / 2, 2),
                "ask": round(price + spread / 2, 2),
                "spread": spread,
                "direction": "up" if price >= prev else "down",
            }

        for name, data in INITIAL_INDICES.items():
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

        # Realistic tick variation (-0.12% to +0.12% micro-movement)
        pct_delta = random.gauss(0.00005, 0.0006)
        tick_increment = 0.05 if old_price < 1000 else (0.10 if old_price < 3000 else 0.25)

        raw_price = old_price * (1.0 + pct_delta)
        # Snap to valid tick size
        new_price = round(round(raw_price / tick_increment) * tick_increment, 2)

        # Prevent runaway stray movements beyond intraday bands
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

        # Occasionally broadcast updated L2 depth for this ticker (30% chance on tick)
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

