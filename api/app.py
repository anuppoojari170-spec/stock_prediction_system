"""
Flask API for the AI Stock Trading Platform.

This module is intentionally thin: it wires HTTP routes to the business
logic in predictor.py (AI signals, market data) and trading.py (portfolio,
trades, stats), and to database.py (persistence). All original routes keep
their original URL and method, so the existing frontend contract still
works; several new routes have been added to power the upgraded dashboard.
"""

import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

from database import init_db, get_connection, log_activity
from predictor import (
    predict_stock,
    get_stock_data,
    get_market_overview,
    get_movers,
    get_market_sentiment,
)
from trading import (
    TradingError,
    buy_stock,
    sell_stock,
    get_portfolio_with_pnl,
    get_portfolio_summary,
    get_todays_pnl,
    get_trading_stats,
    get_live_price,
)

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

init_db()


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(FRONTEND_DIR, "index.html")
    return jsonify({
        "project": "AI Stock Trading Platform",
        "status": "Running"
    })


@app.route("/api")
@app.route("/api/health")
def api_health():
    return jsonify({
        "project": "AI Stock Trading Platform",
        "status": "Running"
    })


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.route("/api/dashboard")
def dashboard():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT balance FROM account WHERE id=1")
    balance = cur.fetchone()["balance"]

    cur.execute("SELECT SUM(shares) FROM portfolio")
    result = cur.fetchone()[0]
    holdings = result if result else 0

    cur.execute("SELECT COUNT(*) FROM transactions")
    transactions_count = cur.fetchone()[0]

    conn.close()

    summary = get_portfolio_summary()
    todays_pnl = get_todays_pnl()

    return jsonify({
        "balance": round(balance, 2),
        "holdings_count": holdings,
        "transactions_count": transactions_count,
        "total_invested": summary["total_invested"],
        "current_value": summary["current_value"],
        "total_pnl": summary["total_pnl"],
        "growth_pct": summary["growth_pct"],
        "todays_pnl": todays_pnl,
    })


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.json or {}
    ticker = data.get("ticker", "")

    if not ticker.strip():
        return jsonify({"error": "Please provide a stock symbol"}), 400

    result = predict_stock(ticker)
    return jsonify(result)


@app.route("/api/history/<ticker>")
def stock_history(ticker):
    try:
        df = get_stock_data(ticker, period="1mo")

        if df is None or df.empty:
            return jsonify({"error": "No data found"})

        data = []
        for _, row in df.iterrows():
            data.append({
                "date": row["Date"].strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
            })

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/quote/<ticker>")
def quote(ticker):
    price = get_live_price(ticker)
    if price is None:
        return jsonify({"error": "No data found"}), 404
    return jsonify({"ticker": ticker.upper(), "price": price})


# ---------------------------------------------------------------------------
# AI Trading Assistant / Market Intelligence
# ---------------------------------------------------------------------------

@app.route("/api/assistant")
def assistant():
    """Generate plain-language insights from the existing prediction logic."""
    tickers = request.args.get("tickers", "RELIANCE,TCS,HDFCBANK,INFY")
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]

    insights = []
    for ticker in ticker_list:
        result = predict_stock(ticker)
        if "error" in result:
            continue

        signal = result["signal"]
        recommendation = result.get("recommendation", signal)

        if recommendation == "STRONG BUY":
            text = f"{ticker} is showing strong bullish momentum."
        elif signal == "BUY":
            text = f"{ticker} is currently bullish."
        elif recommendation == "STRONG SELL":
            text = f"{ticker} has a strong SELL signal — momentum is weakening."
        elif signal == "SELL":
            text = f"{ticker} currently has a SELL signal."
        else:
            text = f"{ticker} is consolidating — no clear trend yet."

        insights.append({
            "ticker": ticker,
            "text": text,
            "signal": signal,
            "confidence": result["confidence"],
        })

    return jsonify({"insights": insights})


@app.route("/api/market-overview")
def market_overview():
    return jsonify(get_market_overview())


@app.route("/api/movers")
def movers():
    return jsonify(get_movers())


@app.route("/api/sentiment")
def sentiment():
    return jsonify(get_market_sentiment())


# ---------------------------------------------------------------------------
# Trading
# ---------------------------------------------------------------------------

@app.route("/api/buy", methods=["POST"])
def buy_route():
    data = request.json or {}
    try:
        ticker = data["ticker"]
        quantity = int(data["quantity"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"message": "Invalid stock symbol or quantity"}), 400

    try:
        result = buy_stock(ticker, quantity)
        return jsonify(result)
    except TradingError as e:
        return jsonify({"message": e.message}), e.status_code


@app.route("/api/sell", methods=["POST"])
def sell_route():
    data = request.json or {}
    try:
        ticker = data["ticker"]
        quantity = int(data["quantity"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"message": "Invalid stock symbol or quantity"}), 400

    try:
        result = sell_stock(ticker, quantity)
        return jsonify(result)
    except TradingError as e:
        return jsonify({"message": e.message}), e.status_code


@app.route("/api/portfolio")
def portfolio():
    """Original shape: array of [ticker, shares, avg_price] rows."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT ticker, shares, avg_price FROM portfolio")
    rows = [[r["ticker"], r["shares"], r["avg_price"]] for r in cur.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route("/api/portfolio/detailed")
def portfolio_detailed():
    """Enriched portfolio with live prices and unrealized P&L per holding."""
    return jsonify(get_portfolio_with_pnl())


@app.route("/api/portfolio/summary")
def portfolio_summary():
    return jsonify(get_portfolio_summary())


@app.route("/api/stats")
def stats():
    return jsonify(get_trading_stats())


@app.route("/api/account")
def account():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT balance FROM account WHERE id=1")
    balance = cur.fetchone()["balance"]
    conn.close()
    return jsonify({"balance": round(balance, 2)})


@app.route("/api/cleanup")
def cleanup():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM portfolio
        WHERE ticker IS NULL OR TRIM(ticker) = ''
    """)
    conn.commit()
    conn.close()
    return jsonify({"message": "Cleanup complete"})


@app.route("/api/transactions")
def transactions():
    """Original shape: array of [type, ticker, quantity, total, timestamp] rows."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT type, ticker, quantity, total, timestamp
        FROM transactions
        ORDER BY id DESC
    """)
    rows = [[r["type"], r["ticker"], r["quantity"], r["total"], r["timestamp"]] for r in cur.fetchall()]
    conn.close()
    return jsonify(rows)


# ---------------------------------------------------------------------------
# Watchlist (now persisted server-side instead of living only in JS memory)
# ---------------------------------------------------------------------------

@app.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT ticker, pinned FROM watchlist ORDER BY pinned DESC, added_at ASC")
    rows = [{"ticker": r["ticker"], "pinned": bool(r["pinned"])} for r in cur.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route("/api/watchlist", methods=["POST"])
def add_watchlist():
    data = request.json or {}
    ticker = data.get("ticker", "").strip().upper()

    if not ticker:
        return jsonify({"message": "Please enter a stock symbol"}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT OR IGNORE INTO watchlist (ticker) VALUES (?)", (ticker,))
    conn.commit()
    conn.close()

    log_activity(f"Added {ticker} to Watchlist", "watchlist")

    return jsonify({"message": f"{ticker} added to watchlist"})


@app.route("/api/watchlist/<ticker>", methods=["DELETE"])
def remove_watchlist(ticker):
    ticker = ticker.strip().upper()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM watchlist WHERE ticker=?", (ticker,))
    conn.commit()
    conn.close()
    return jsonify({"message": f"{ticker} removed from watchlist"})


@app.route("/api/watchlist/<ticker>/pin", methods=["POST"])
def pin_watchlist(ticker):
    ticker = ticker.strip().upper()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT pinned FROM watchlist WHERE ticker=?", (ticker,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"message": f"{ticker} not in watchlist"}), 404

    new_state = 0 if row["pinned"] else 1
    cur.execute("UPDATE watchlist SET pinned=? WHERE ticker=?", (new_state, ticker))
    conn.commit()
    conn.close()
    return jsonify({"ticker": ticker, "pinned": bool(new_state)})


# ---------------------------------------------------------------------------
# Activity feed
# ---------------------------------------------------------------------------

@app.route("/api/activity")
def activity():
    limit = request.args.get("limit", 20, type=int)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT message, category, timestamp FROM activity ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = [
        {"message": r["message"], "category": r["category"], "timestamp": r["timestamp"]}
        for r in cur.fetchall()
    ]
    conn.close()
    return jsonify(rows)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, port=port)
