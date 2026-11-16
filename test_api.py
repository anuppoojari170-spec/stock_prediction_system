#!/usr/bin/env python3
"""
TradePilot AI — Automated API Verification & Testing Script
Tests authentication, user profile, portfolio, watchlist, market data, and trading rules
using the pre-configured test user credentials.
"""

import os
import sys

# Ensure backend directory is in python search path
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
from app.db.session import init_db, get_raw_connection
from app.schemas.auth import UserLogin
from app.schemas.trading import OrderRequest
from app.api.v1.endpoints.auth import login, get_profile
from app.api.v1.endpoints.trading import get_portfolio, execute_buy
from app.api.v1.endpoints.watchlist import list_watchlist
from app.api.v1.endpoints.market import market_overview, get_quote
from app.api.v1.endpoints.prediction import predict_stock
from app.core.security import decode_access_token
from fastapi import HTTPException

GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def print_step(title: str):
    print(f"\n{BLUE}{BOLD}=== {title} ==={RESET}")


def print_success(msg: str):
    print(f" {GREEN}✓{RESET} {msg}")


def print_fail(msg: str):
    print(f" {RED}✗{RESET} {msg}")


def main():
    print(f"{BOLD}{BLUE}==================================================")
    print(f"  TradePilot AI — API Verification Suite")
    print(f"  Test User: {settings.TEST_USER_LOGIN} ({settings.TEST_USER_EMAIL})")
    print(f"  Password:  {settings.TEST_USER_PASSWORD}")
    print(f"=================================================={RESET}")

    # Step 1: Initialize Database & Ensure Seed User
    print_step("1. Initializing Database & Seed Test Accounts")
    init_db()
    conn = get_raw_connection()
    print_success("Database initialized and test users seeded successfully.")

    # Step 2: Test Login Endpoint
    print_step("2. Testing POST /api/v1/auth/login")
    login_req = UserLogin(
        login=settings.TEST_USER_LOGIN,
        password=settings.TEST_USER_PASSWORD,
    )
    token_obj = login(login_req, db=conn)
    token = token_obj.access_token
    assert token, "Token missing in response"
    print_success(f"Login successful for '{settings.TEST_USER_LOGIN}'!")
    print_success(f"Access Token: {token[:28]}... (Bearer JWT, expires in {token_obj.expires_in_minutes} min)")

    # Decode payload to simulate auth dependency
    payload = decode_access_token(token)
    user_id = int(payload["sub"])
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.email, u.username, u.full_name, u.created_at, a.balance FROM users u LEFT JOIN accounts a ON a.user_id = u.id WHERE u.id = ?",
        (user_id,)
    )
    current_user = dict(cur.fetchone())

    # Step 3: Test Profile Endpoint (GET /api/v1/auth/me)
    print_step("3. Testing GET /api/v1/auth/me")
    profile = get_profile(current_user=current_user)
    print_success(f"User Profile: ID={profile.id}, Username={profile.username}, FullName='{profile.full_name}'")
    print_success(f"Virtual Margin Balance: ₹{profile.balance:,.2f}")

    # Step 4: Test Portfolio Holdings (GET /api/v1/trading/portfolio)
    print_step("4. Testing GET /api/v1/trading/portfolio")
    holdings = get_portfolio(current_user=current_user, db=conn)
    print_success(f"Retrieved {len(holdings)} portfolio holdings:")
    for h in holdings:
        t = h["ticker"] if isinstance(h, dict) else h.ticker
        s = h["shares"] if isinstance(h, dict) else h.shares
        avg = h["avg_price"] if isinstance(h, dict) else h.avg_price
        sec = h.get("sector") if isinstance(h, dict) else getattr(h, "sector", "")
        val = h.get("current_value", 0) if isinstance(h, dict) else getattr(h, "current_value", 0)
        print(f"   • {t}: {s} shares @ avg ₹{avg:,.2f} | Sector: {sec} | Value: ₹{val:,.2f}")

    # Step 5: Test Watchlist (GET /api/v1/watchlist)
    print_step("5. Testing GET /api/v1/watchlist")
    watchlist = list_watchlist(category="Watchlist 1", current_user=current_user, db=conn)
    print_success(f"Retrieved {len(watchlist)} watchlist items in 'Watchlist 1':")
    for item in watchlist[:5]:
        t = item["ticker"] if isinstance(item, dict) else item.ticker
        p = item.get("current_price", 0) if isinstance(item, dict) else getattr(item, "current_price", 0)
        ch = item.get("change_pct", 0) if isinstance(item, dict) else getattr(item, "change_pct", 0)
        co = item.get("company_name", "") if isinstance(item, dict) else getattr(item, "company_name", "")
        print(f"   • {t}: ₹{p:,.2f} ({ch:+.2f}%) | Company: {co}")

    # Step 6: Test Index Order Blocking (POST /api/v1/trading/buy with NIFTY 50)
    print_step("6. Testing Index Order Blocking (POST /api/v1/trading/buy)")
    try:
        execute_buy(OrderRequest(ticker="NIFTY 50", quantity=10), current_user=current_user, db=conn)
        print_fail("NIFTY 50 order should have been blocked!")
        assert False, "NIFTY 50 order was not blocked"
    except HTTPException as e:
        assert e.status_code == 400
        print_success(f"Index order correctly rejected with 400: '{e.detail}'")

    # Step 7: Test Benchmark Indices (GET /api/v1/market/overview)
    print_step("7. Testing GET /api/v1/market/overview")
    indices = market_overview()
    print_success(f"Retrieved {len(indices)} benchmark indices:")
    for idx in indices:
        n = idx["name"] if isinstance(idx, dict) else idx.name
        v = idx["value"] if isinstance(idx, dict) else idx.value
        c = idx.get("change_pct", 0) if isinstance(idx, dict) else getattr(idx, "change_pct", 0)
        print(f"   • {n}: {v:,.2f} ({c:+.2f}%)")

    # Step 8: Test Stock Live Quote (GET /api/v1/market/quote/RELIANCE)
    print_step("8. Testing GET /api/v1/market/quote/RELIANCE")
    quote = get_quote("RELIANCE")
    qp = quote["price"] if isinstance(quote, dict) else quote.price
    qch = quote.get("change_pct", 0) if isinstance(quote, dict) else getattr(quote, "change_pct", 0)
    qpc = quote.get("prev_close", 0) if isinstance(quote, dict) else getattr(quote, "prev_close", 0)
    print_success(f"RELIANCE Quote: ₹{qp:,.2f} | Change: {qch:+.2f}% | Prev Close: ₹{qpc:,.2f}")

    # Step 9: Test ML Prediction & Sentiment (GET /api/v1/predictions/RELIANCE)
    print_step("9. Testing GET /api/v1/predictions/RELIANCE")
    pred = predict_stock("RELIANCE")
    psig = pred["signal"] if isinstance(pred, dict) else pred.signal
    pconf = pred["confidence"] if isinstance(pred, dict) else pred.confidence
    psent = pred.get("sentiment_label") if isinstance(pred, dict) else getattr(pred, "sentiment_label", "")
    print_success(f"Signal: {psig} | Confidence: {pconf}% | Sentiment: {psent}")
    ptp = pred.get("trade_plan") if isinstance(pred, dict) else getattr(pred, "trade_plan", None)
    if ptp:
        pe = ptp["entry"] if isinstance(ptp, dict) else ptp.entry
        pt1 = ptp["target_1"] if isinstance(ptp, dict) else ptp.target_1
        psl = ptp["stop_loss"] if isinstance(ptp, dict) else ptp.stop_loss
        print(f"   • Entry: ₹{pe:.2f} | Target: ₹{pt1:.2f} | Stop Loss: ₹{psl:.2f}")

    conn.close()

    print(f"\n{BOLD}{GREEN}==================================================")
    print(f"  ALL 9 API TEST SUITES PASSED SUCCESSFULLY!")
    print(f"=================================================={RESET}\n")


if __name__ == "__main__":
    main()
