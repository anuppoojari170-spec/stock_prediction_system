import asyncio
import json
import logging
from typing import Dict, List, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger("TradeAIPilot.WebSocket")


class ConnectionManager:
    """Manages real-time WebSocket client connections and topic subscriptions."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        # Maps websocket -> set of subscribed tickers/topics (empty set = all)
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
            self.subscriptions[websocket] = set()
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
            self.subscriptions.pop(websocket, None)
        logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def subscribe(self, websocket: WebSocket, tickers: List[str]):
        async with self._lock:
            if websocket in self.subscriptions:
                for t in tickers:
                    self.subscriptions[websocket].add(t.strip().upper())
        logger.debug(f"Client subscriptions updated: {self.subscriptions.get(websocket, set())}")

    async def unsubscribe(self, websocket: WebSocket, tickers: List[str]):
        async with self._lock:
            if websocket in self.subscriptions:
                for t in tickers:
                    self.subscriptions[websocket].discard(t.strip().upper())

    async def send_personal_json(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")

    async def broadcast_json(self, message: dict, ticker: Optional[str] = None):
        """Broadcast message to connected clients interested in the given ticker."""
        if not self.active_connections:
            return

        payload = json.dumps(message)
        dead_connections = []

        # Read snapshot of connections under lock
        async with self._lock:
            targets = []
            clean_ticker = ticker.strip().upper() if ticker else None
            for ws in self.active_connections:
                subs = self.subscriptions.get(ws, set())
                # If client subscribed to specific tickers, only send if matches;
                # if client subscriptions is empty, client receives all active ticks
                if clean_ticker is None or len(subs) == 0 or clean_ticker in subs:
                    targets.append(ws)

        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    self.active_connections.discard(ws)
                    self.subscriptions.pop(ws, None)


ws_manager = ConnectionManager()

