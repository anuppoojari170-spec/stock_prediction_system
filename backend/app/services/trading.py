import sqlite3
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.services.market_data import market_service


def buy_stock(user_id: int, ticker: str, quantity: int, db: sqlite3.Connection) -> Dict[str, Any]:
    ticker = ticker.strip().upper().replace(".NS", "")
    price = market_service.get_live_price(ticker)

    if price is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not fetch live market price for {ticker}. Please verify symbol."
        )

    cost = round(quantity * price, 2)

    with db:
        cur = db.cursor()

        # Atomic balance check and deduction in database
        cur.execute(
            "UPDATE accounts SET balance = balance - ? WHERE user_id = ? AND balance >= ?",
            (cost, user_id, cost)
        )
        if cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient virtual balance for this purchase."
            )

        # Check existing portfolio holding for this user
        cur.execute(
            "SELECT shares, invested_amount FROM portfolios WHERE user_id = ? AND ticker = ?",
            (user_id, ticker)
        )
        row = cur.fetchone()

        if row:
            new_shares = row["shares"] + quantity
            new_invested = (row["invested_amount"] or 0.0) + cost
            new_avg = round(new_invested / new_shares, 2)
            cur.execute(
                """
                UPDATE portfolios
                SET shares = ?, avg_price = ?, invested_amount = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND ticker = ?
                """,
                (new_shares, new_avg, new_invested, user_id, ticker)
            )
        else:
            cur.execute(
                """
                INSERT INTO portfolios (user_id, ticker, shares, avg_price, invested_amount)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, ticker, quantity, price, cost)
            )

        # Record transaction
        cur.execute(
            """
            INSERT INTO transactions (user_id, ticker, type, quantity, price, total)
            VALUES (?, ?, 'BUY', ?, ?, ?)
            """,
            (user_id, ticker, quantity, price, cost)
        )

        # Log activity
        cur.execute(
            """
            INSERT INTO activities (user_id, message, category)
            VALUES (?, ?, 'trade')
            """,
            (user_id, f"Bought {quantity} shares of {ticker} at ₹{price:,.2f}")
        )

    return {
        "message": f"Successfully purchased {quantity} shares of {ticker} at ₹{price:,.2f}",
        "ticker": ticker,
        "quantity": quantity,
        "price": price,
        "total": cost,
        "type": "BUY",
    }


def sell_stock(user_id: int, ticker: str, quantity: int, db: sqlite3.Connection) -> Dict[str, Any]:
    ticker = ticker.strip().upper().replace(".NS", "")
    price = market_service.get_live_price(ticker)

    if price is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not fetch live market price for {ticker}. Please try again shortly."
        )

    revenue = round(quantity * price, 2)

    with db:
        cur = db.cursor()

        cur.execute(
            "SELECT shares, invested_amount FROM portfolios WHERE user_id = ? AND ticker = ?",
            (user_id, ticker)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You do not own any shares of {ticker} in your portfolio."
            )

        current_shares = row["shares"]
        if quantity > current_shares:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot sell {quantity} shares. You only own {current_shares} shares."
            )

        new_shares = current_shares - quantity

        if new_shares == 0:
            cur.execute(
                "DELETE FROM portfolios WHERE user_id = ? AND ticker = ?",
                (user_id, ticker)
            )
        else:
            avg_price = (row["invested_amount"] or 0.0) / current_shares if current_shares else 0.0
            new_invested = round(avg_price * new_shares, 2)
            cur.execute(
                """
                UPDATE portfolios
                SET shares = ?, invested_amount = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND ticker = ?
                """,
                (new_shares, new_invested, user_id, ticker)
            )

        # Credit balance
        cur.execute(
            "UPDATE accounts SET balance = balance + ? WHERE user_id = ?",
            (revenue, user_id)
        )

        # Record transaction
        cur.execute(
            """
            INSERT INTO transactions (user_id, ticker, type, quantity, price, total)
            VALUES (?, ?, 'SELL', ?, ?, ?)
            """,
            (user_id, ticker, quantity, price, revenue)
        )

        # Log activity
        cur.execute(
            """
            INSERT INTO activities (user_id, message, category)
            VALUES (?, ?, 'trade')
            """,
            (user_id, f"Sold {quantity} shares of {ticker} at ₹{price:,.2f}")
        )

    return {
        "message": f"Successfully sold {quantity} shares of {ticker} at ₹{price:,.2f}",
        "ticker": ticker,
        "quantity": quantity,
        "price": price,
        "total": revenue,
        "type": "SELL",
    }


def get_portfolio_holdings(user_id: int, db: sqlite3.Connection) -> List[Dict[str, Any]]:
    cur = db.cursor()
    cur.execute(
        "SELECT ticker, shares, avg_price, invested_amount FROM portfolios WHERE user_id = ?",
        (user_id,)
    )
    rows = cur.fetchall()

    enriched = []
    for row in rows:
        ticker = row["ticker"]
        shares = row["shares"]
        avg_price = float(row["avg_price"] or 0.0)
        invested = float(row["invested_amount"] or (avg_price * shares))

        live_price = market_service.get_live_price(ticker) or avg_price
        current_value = round(live_price * shares, 2)
        pnl = round(current_value - invested, 2)
        pnl_pct = round((pnl / invested) * 100, 2) if invested > 0 else 0.0

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


def get_portfolio_summary(user_id: int, db: sqlite3.Connection) -> Dict[str, Any]:
    cur = db.cursor()

    cur.execute("SELECT balance FROM accounts WHERE user_id = ?", (user_id,))
    acc = cur.fetchone()
    balance = float(acc["balance"]) if acc else 0.0

    cur.execute("SELECT COUNT(*) as txn_count FROM transactions WHERE user_id = ?", (user_id,))
    transactions_count = cur.fetchone()["txn_count"]

    holdings = get_portfolio_holdings(user_id, db)

    total_invested = round(sum(h["invested"] for h in holdings), 2)
    current_value = round(sum(h["current_value"] for h in holdings), 2)
    total_pnl = round(current_value - total_invested, 2)
    growth_pct = round((total_pnl / total_invested) * 100, 2) if total_invested > 0 else 0.0

    # Today's P&L estimation from 1-day change
    todays_pnl = 0.0
    for h in holdings:
        try:
            df = market_service.get_history(h["ticker"], period="5d")
            if df is not None and len(df) >= 2:
                latest = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2])
                todays_pnl += (latest - prev) * h["shares"]
        except Exception:
            continue

    return {
        "balance": round(balance, 2),
        "total_invested": total_invested,
        "current_value": current_value,
        "total_pnl": total_pnl,
        "growth_pct": growth_pct,
        "holdings_count": len(holdings),
        "todays_pnl": round(todays_pnl, 2),
        "transactions_count": transactions_count,
    }


def get_user_transactions(user_id: int, db: sqlite3.Connection, limit: int = 50) -> List[Dict[str, Any]]:
    cur = db.cursor()
    cur.execute(
        """
        SELECT id, ticker, type, quantity, price, total, timestamp
        FROM transactions
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (user_id, limit)
    )
    rows = cur.fetchall()
    return [
        {
            "id": r["id"],
            "ticker": r["ticker"],
            "type": r["type"],
            "quantity": r["quantity"],
            "price": r["price"],
            "total": r["total"],
            "timestamp": str(r["timestamp"]),
        }
        for r in rows
    ]


def get_user_watchlist_categories(user_id: int, db: sqlite3.Connection) -> List[Dict[str, Any]]:
    cur = db.cursor()
    cur.execute("SELECT name FROM user_watchlists WHERE user_id = ? ORDER BY id ASC", (user_id,))
    cats = [r["name"] for r in cur.fetchall()]

    # Fetch distinct category names from watchlists
    cur.execute("SELECT DISTINCT COALESCE(name, 'Watchlist 1') as name FROM watchlists WHERE user_id = ?", (user_id,))
    for r in cur.fetchall():
        if r["name"] and r["name"] not in cats:
            cats.append(r["name"])

    out = []
    for cat in cats:
        cur.execute(
            "SELECT COUNT(*) as cnt FROM watchlists WHERE user_id = ? AND (name = ? OR (name IS NULL AND ? = 'Watchlist 1'))",
            (user_id, cat, cat)
        )
        cnt = cur.fetchone()["cnt"]
        out.append({"name": cat, "count": cnt})
    return out


def create_user_watchlist_category(user_id: int, name: str, db: sqlite3.Connection) -> None:
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Watchlist name cannot be empty.")
    with db:
        cur = db.cursor()
        cur.execute(
            "INSERT INTO user_watchlists (user_id, name) VALUES (?, ?) ON CONFLICT (user_id, name) DO NOTHING",
            (user_id, clean_name)
        )


def delete_user_watchlist_category(user_id: int, name: str, db: sqlite3.Connection) -> None:
    clean_name = name.strip()
    with db:
        cur = db.cursor()
        cur.execute("DELETE FROM user_watchlists WHERE user_id = ? AND name = ?", (user_id, clean_name))
        cur.execute(
            "DELETE FROM watchlists WHERE user_id = ? AND (name = ? OR (name IS NULL AND ? = 'Watchlist 1'))",
            (user_id, clean_name, clean_name)
        )


def get_user_watchlist(user_id: int, db: sqlite3.Connection, category: Optional[str] = None) -> List[Dict[str, Any]]:
    cur = db.cursor()
    if category:
        cur.execute(
            """
            SELECT ticker, pinned, added_at, COALESCE(name, 'Watchlist 1') as name
            FROM watchlists
            WHERE user_id = ? AND (name = ? OR (name IS NULL AND ? = 'Watchlist 1'))
            ORDER BY pinned DESC, added_at ASC
            """,
            (user_id, category, category)
        )
    else:
        cur.execute(
            """
            SELECT ticker, pinned, added_at, COALESCE(name, 'Watchlist 1') as name
            FROM watchlists
            WHERE user_id = ?
            ORDER BY pinned DESC, added_at ASC
            """,
            (user_id,)
        )
    results = []
    for r in cur.fetchall():
        ticker = r["ticker"]
        try:
            details = market_service.get_stock_details(ticker)
            company_name = details.get("companyName", f"{ticker} Limited")
            price = details.get("price", 1000.0)
            change_abs = details.get("changeAbs", 0.0)
            change_pct = details.get("changePct", 0.0)
            volume = f"{round(details.get('volume', 2500000) / 1000000, 1)}M"
        except Exception:
            company_name = f"{ticker} Limited"
            price = market_service.get_live_price(ticker) or 1000.0
            change_abs = 0.0
            change_pct = 0.0
            volume = "2.5M"

        results.append({
            "ticker": ticker,
            "pinned": bool(r["pinned"]),
            "category": r["name"],
            "companyName": company_name,
            "price": price,
            "change_abs": change_abs,
            "change_pct": change_pct,
            "volume": volume,
            "added_at": str(r["added_at"]),
        })
    return results


def add_to_watchlist(user_id: int, ticker: str, db: sqlite3.Connection, category: str = "Watchlist 1") -> None:
    ticker = ticker.strip().upper().replace(".NS", "")
    cat = category.strip() if category else "Watchlist 1"
    with db:
        cur = db.cursor()
        # Ensure category is registered in user_watchlists
        cur.execute(
            "INSERT INTO user_watchlists (user_id, name) VALUES (?, ?) ON CONFLICT (user_id, name) DO NOTHING",
            (user_id, cat)
        )
        cur.execute(
            "INSERT INTO watchlists (user_id, name, ticker) VALUES (?, ?, ?) ON CONFLICT (user_id, name, ticker) DO NOTHING",
            (user_id, cat, ticker)
        )


def remove_from_watchlist(user_id: int, ticker: str, db: sqlite3.Connection, category: Optional[str] = None) -> None:
    ticker = ticker.strip().upper().replace(".NS", "")
    with db:
        cur = db.cursor()
        if category:
            cur.execute(
                "DELETE FROM watchlists WHERE user_id = ? AND ticker = ? AND (name = ? OR (name IS NULL AND ? = 'Watchlist 1'))",
                (user_id, ticker, category, category)
            )
        else:
            cur.execute(
                "DELETE FROM watchlists WHERE user_id = ? AND ticker = ?",
                (user_id, ticker)
            )


def toggle_pin_watchlist(user_id: int, ticker: str, db: sqlite3.Connection, category: Optional[str] = None) -> bool:
    ticker = ticker.strip().upper().replace(".NS", "")
    with db:
        cur = db.cursor()
        if category:
            cur.execute(
                "SELECT pinned FROM watchlists WHERE user_id = ? AND ticker = ? AND (name = ? OR (name IS NULL AND ? = 'Watchlist 1'))",
                (user_id, ticker, category, category)
            )
        else:
            cur.execute(
                "SELECT pinned FROM watchlists WHERE user_id = ? AND ticker = ?",
                (user_id, ticker)
            )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Symbol not in watchlist")

        new_pinned = 0 if row["pinned"] else 1
        if category:
            cur.execute(
                "UPDATE watchlists SET pinned = ? WHERE user_id = ? AND ticker = ? AND (name = ? OR (name IS NULL AND ? = 'Watchlist 1'))",
                (new_pinned, user_id, ticker, category, category)
            )
        else:
            cur.execute(
                "UPDATE watchlists SET pinned = ? WHERE user_id = ? AND ticker = ?",
                (new_pinned, user_id, ticker)
            )
        return bool(new_pinned)


def deposit_funds(user_id: int, amount: float, db: sqlite3.Connection) -> Dict[str, Any]:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be positive.")
    with db:
        cur = db.cursor()
        cur.execute("UPDATE accounts SET balance = balance + ? WHERE user_id = ?", (amount, user_id))
        cur.execute("SELECT balance FROM accounts WHERE user_id = ?", (user_id,))
        new_balance = cur.fetchone()["balance"]
        cur.execute(
            "INSERT INTO activities (user_id, message, category) VALUES (?, ?, 'deposit')",
            (user_id, f"Deposited ₹{amount:,.2f} virtual margin into account.")
        )
    return {"message": f"Successfully deposited ₹{amount:,.2f}", "balance": float(new_balance)}


def reset_funds(user_id: int, db: sqlite3.Connection) -> Dict[str, Any]:
    with db:
        cur = db.cursor()
        cur.execute("UPDATE accounts SET balance = 1000000.0 WHERE user_id = ?", (user_id,))
        cur.execute(
            "INSERT INTO activities (user_id, message, category) VALUES (?, ?, 'reset')",
            (user_id, "Reset account virtual balance to ₹10,00,000.00.")
        )
    return {"message": "Account balance successfully reset to ₹10,00,000.00", "balance": 1000000.0}


