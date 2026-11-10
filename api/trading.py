"""
Trading engine for the AI Stock Trading Platform.

Holds all portfolio/account business logic so that api/app.py can stay a
thin routing layer. Buy/sell now executes at the live market price (via
yfinance) instead of a hardcoded stub price.
"""

import yfinance as yf
from database import get_connection, log_activity


class TradingError(Exception):
    """Raised for any expected trading failure (bad ticker, insufficient funds, etc.)."""
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_live_price(ticker):
    """Fetch the latest traded price for an NSE-listed ticker."""
    try:
        stock = yf.Ticker(ticker.upper() + ".NS")
        df = stock.history(period="1d")
        if df.empty:
            # Fall back to a slightly longer window in case "1d" has no bars
            df = stock.history(period="5d")
        if df.empty:
            return None
        return round(float(df["Close"].iloc[-1]), 2)
    except Exception:
        return None


def get_account_balance():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT balance FROM account WHERE id=1")
    row = cur.fetchone()
    conn.close()
    return row["balance"] if row else 0.0


def buy_stock(ticker, quantity):
    ticker = ticker.strip().upper()
    if not ticker:
        raise TradingError("Please enter a stock symbol")
    if quantity <= 0:
        raise TradingError("Quantity must be greater than zero")

    price = get_live_price(ticker)
    if price is None:
        raise TradingError(f"Could not fetch live price for {ticker}. Check the symbol.")

    cost = round(quantity * price, 2)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT balance FROM account WHERE id=1")
    balance = cur.fetchone()["balance"]

    if cost > balance:
        conn.close()
        raise TradingError("Insufficient balance for this purchase")

    cur.execute("SELECT shares, invested_amount FROM portfolio WHERE ticker=?", (ticker,))
    row = cur.fetchone()

    if row:
        new_shares = row["shares"] + quantity
        new_invested = (row["invested_amount"] or 0) + cost
        new_avg = round(new_invested / new_shares, 2) if new_shares else 0
        cur.execute(
            """
            UPDATE portfolio
            SET shares=?, avg_price=?, invested_amount=?
            WHERE ticker=?
            """,
            (new_shares, new_avg, new_invested, ticker)
        )
    else:
        cur.execute(
            """
            INSERT INTO portfolio (ticker, shares, avg_price, invested_amount)
            VALUES (?, ?, ?, ?)
            """,
            (ticker, quantity, price, cost)
        )

    cur.execute(
        "UPDATE account SET balance = balance - ? WHERE id=1",
        (cost,)
    )

    cur.execute(
        """
        INSERT INTO transactions (ticker, type, quantity, price, total)
        VALUES (?, ?, ?, ?, ?)
        """,
        (ticker, "BUY", quantity, price, cost)
    )

    conn.commit()
    conn.close()

    log_activity(f"Bought {quantity} shares of {ticker} at \u20b9{price}", "trade")

    return {
        "message": f"Bought {quantity} shares of {ticker} at \u20b9{price}",
        "ticker": ticker,
        "quantity": quantity,
        "price": price,
        "total": cost,
    }


def sell_stock(ticker, quantity):
    ticker = ticker.strip().upper()
    if not ticker:
        raise TradingError("Please enter a stock symbol")
    if quantity <= 0:
        raise TradingError("Quantity must be greater than zero")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT shares, invested_amount FROM portfolio WHERE ticker=?", (ticker,))
    row = cur.fetchone()

    if not row:
        conn.close()
        raise TradingError(f"{ticker} not found in portfolio")

    current_shares = row["shares"]

    if quantity > current_shares:
        conn.close()
        raise TradingError("Not enough shares to sell")

    price = get_live_price(ticker)
    if price is None:
        conn.close()
        raise TradingError(f"Could not fetch live price for {ticker}. Try again shortly.")

    value = round(quantity * price, 2)
    new_shares = current_shares - quantity

    if new_shares == 0:
        cur.execute("DELETE FROM portfolio WHERE ticker=?", (ticker,))
    else:
        avg_price = (row["invested_amount"] or 0) / current_shares if current_shares else 0
        new_invested = avg_price * new_shares
        cur.execute(
            """
            UPDATE portfolio
            SET shares=?, invested_amount=?
            WHERE ticker=?
            """,
            (new_shares, new_invested, ticker)
        )

    cur.execute(
        "UPDATE account SET balance = balance + ? WHERE id=1",
        (value,)
    )

    cur.execute(
        """
        INSERT INTO transactions (ticker, type, quantity, price, total)
        VALUES (?, ?, ?, ?, ?)
        """,
        (ticker, "SELL", quantity, price, value)
    )

    conn.commit()
    conn.close()

    log_activity(f"Sold {quantity} shares of {ticker} at \u20b9{price}", "trade")

    return {
        "message": f"Sold {quantity} shares of {ticker} at \u20b9{price}",
        "ticker": ticker,
        "quantity": quantity,
        "price": price,
        "total": value,
    }


def get_portfolio_with_pnl():
    """Return portfolio rows enriched with live price and unrealized P&L."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT ticker, shares, avg_price, invested_amount FROM portfolio")
    rows = cur.fetchall()
    conn.close()

    enriched = []
    for row in rows:
        ticker = row["ticker"]
        shares = row["shares"]
        avg_price = row["avg_price"] or 0
        invested = row["invested_amount"] or (avg_price * shares)

        live_price = get_live_price(ticker) or avg_price
        current_value = round(live_price * shares, 2)
        pnl = round(current_value - invested, 2)
        pnl_pct = round((pnl / invested) * 100, 2) if invested else 0

        enriched.append({
            "ticker": ticker,
            "shares": shares,
            "avg_price": round(avg_price, 2),
            "current_price": live_price,
            "invested": round(invested, 2),
            "current_value": current_value,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
        })

    return enriched


def get_portfolio_summary():
    """Aggregate portfolio performance: total invested, current value, P&L, growth%."""
    holdings = get_portfolio_with_pnl()

    total_invested = round(sum(h["invested"] for h in holdings), 2)
    total_value = round(sum(h["current_value"] for h in holdings), 2)
    total_pnl = round(total_value - total_invested, 2)
    growth_pct = round((total_pnl / total_invested) * 100, 2) if total_invested else 0

    return {
        "total_invested": total_invested,
        "current_value": total_value,
        "total_pnl": total_pnl,
        "growth_pct": growth_pct,
        "holdings_count": len(holdings),
    }


def get_todays_pnl():
    """
    Approximate today's P&L as the sum of (day_change_pct * current_value)
    across holdings, using each holding's most recent daily change.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT ticker, shares FROM portfolio")
    rows = cur.fetchall()
    conn.close()

    todays_pnl = 0.0
    for row in rows:
        ticker = row["ticker"]
        shares = row["shares"]
        try:
            stock = yf.Ticker(ticker + ".NS")
            df = stock.history(period="2d")
            if df.empty or len(df) < 2:
                continue
            latest = float(df["Close"].iloc[-1])
            prev = float(df["Close"].iloc[-2])
            todays_pnl += (latest - prev) * shares
        except Exception:
            continue

    return round(todays_pnl, 2)


def get_trading_stats():
    """Compute win rate and trade counts from transaction history."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT ticker, type, quantity, price, total, timestamp
        FROM transactions
        ORDER BY id ASC
    """)
    rows = cur.fetchall()
    conn.close()

    # Match SELL transactions against running average cost (FIFO-ish by ticker)
    # to determine win/loss using a simple running-average cost basis per ticker.
    positions = {}  # ticker -> {"shares": int, "cost": float}
    total_trades = 0
    winning_trades = 0
    losing_trades = 0

    for row in rows:
        ticker = row["ticker"]
        ttype = row["type"]
        qty = row["quantity"]
        price = row["price"]

        if ttype == "BUY":
            total_trades += 1
            pos = positions.setdefault(ticker, {"shares": 0, "cost": 0.0})
            pos["shares"] += qty
            pos["cost"] += qty * price
        elif ttype == "SELL":
            total_trades += 1
            pos = positions.get(ticker)
            if pos and pos["shares"] > 0:
                avg_cost = pos["cost"] / pos["shares"]
                if price >= avg_cost:
                    winning_trades += 1
                else:
                    losing_trades += 1
                # Reduce position proportionally
                remaining_cost_per_share = avg_cost
                pos["shares"] -= qty
                pos["cost"] = max(0, pos["shares"]) * remaining_cost_per_share
                if pos["shares"] <= 0:
                    pos["shares"] = 0
                    pos["cost"] = 0.0

    decided_trades = winning_trades + losing_trades
    win_rate = round((winning_trades / decided_trades) * 100, 1) if decided_trades else 0

    return {
        "total_trades": total_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "win_rate": win_rate,
    }
