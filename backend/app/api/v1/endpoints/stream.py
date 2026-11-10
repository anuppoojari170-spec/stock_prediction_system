import json
import logging
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager
from app.services.market_streamer import market_streamer

router = APIRouter(tags=["Market Stream"])
logger = logging.getLogger("TradeAIPilot.StreamEndpoint")


@router.websocket("/ws/stream")
@router.websocket("/stream")
async def websocket_market_stream(websocket: WebSocket):
    """
    Sub-second real-time streaming endpoint for Indian stock market ticks (NSE/BSE).
    Broadcasts live price updates, index movements, and 5-level L2 order books.
    """
    await ws_manager.connect(websocket)

    # Ensure streaming background loop is running
    if not market_streamer.is_running:
        market_streamer.start()

    try:
        # Send initial snapshot upon connection
        snapshot = market_streamer.get_snapshot()
        await websocket.send_text(
            json.dumps({
                "type": "SNAPSHOT",
                "data": snapshot,
            })
        )

        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
                action = msg.get("action", "").lower()

                if action == "subscribe":
                    tickers = msg.get("tickers", [])
                    if isinstance(tickers, list):
                        await ws_manager.subscribe(websocket, tickers)
                        await websocket.send_text(
                            json.dumps({
                                "type": "SUBSCRIBED",
                                "tickers": [t.upper() for t in tickers],
                            })
                        )

                elif action == "unsubscribe":
                    tickers = msg.get("tickers", [])
                    if isinstance(tickers, list):
                        await ws_manager.unsubscribe(websocket, tickers)

                elif action == "get_depth":
                    ticker = msg.get("ticker", "RELIANCE")
                    depth = market_streamer.generate_depth(ticker)
                    await websocket.send_text(
                        json.dumps({
                            "type": "DEPTH",
                            "data": depth,
                        })
                    )

                elif action == "ping":
                    await websocket.send_text(
                        json.dumps({
                            "type": "PONG",
                            "timestamp": int(time.time() * 1000),
                        })
                    )

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        await ws_manager.disconnect(websocket)

