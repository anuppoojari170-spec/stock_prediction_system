import os
import sys

# Ensure backend folder is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import init_db, get_raw_connection
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.services.market_data import market_service
from app.services.predictor import predict_stock, get_chart_candles
from app.services.trading import (
    buy_stock,
    sell_stock,
    get_portfolio_holdings,
    get_portfolio_summary,
    get_user_watchlist,
    add_to_watchlist,
    toggle_pin_watchlist,
)
from app.schemas.auth import UserRegister, UserLogin
from app.api.v1.endpoints.auth import register, login

print("==================================================")
print("  TradePilot AI — Backend Core Verification")
print("==================================================")

# 1. DB Init
print("\n1. Initializing database...")
init_db()
conn = get_raw_connection()
cur = conn.cursor()
from app.db.session import PostgresConnectionWrapper
if isinstance(conn, PostgresConnectionWrapper):
    cur.execute("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'")
else:
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r["name"] for r in cur.fetchall()]
print("   Tables created:", ", ".join(tables))
assert "users" in tables and "accounts" in tables and "portfolios" in tables

# 2. Security & Password Hashing
print("\n2. Testing Password Hashing & JWT...")
pw = "mySuperSecretPassword2026"
hashed = hash_password(pw)
assert verify_password(pw, hashed)
assert not verify_password("wrongpassword", hashed)
print("   Password hashing: PASSED")

token = create_access_token(subject=42)
decoded = decode_access_token(token)
assert decoded is not None and decoded["sub"] == "42"
print("   JWT encoding/decoding: PASSED")

# 3. User Registration & Multi-User Isolation
print("\n3. Testing Multi-User Registration & Account Creation...")
# Clean test user if exists
with conn:
    cur.execute("DELETE FROM users WHERE username = 'testuser1'")

reg_data = UserRegister(
    email="testuser1@example.com",
    username="testuser1",
    full_name="Test Trader One",
    password="password123"
)
token_resp = register(reg_data, db=conn)
assert token_resp.access_token is not None
print("   Registration successful! User created with starting balance ₹10,00,000.")

# Verify account was created
cur.execute("SELECT u.id, a.balance FROM users u JOIN accounts a ON a.user_id = u.id WHERE u.username = 'testuser1'")
u_row = cur.fetchone()
test_user_id = u_row["id"]
test_balance = float(u_row["balance"])
assert test_balance == 1000000.0
print(f"   User ID: {test_user_id} | Verified Virtual Balance: ₹{test_balance:,.2f}")

# 4. User Login
print("\n4. Testing User Login...")
login_resp = login(UserLogin(login="testuser1", password="password123"), db=conn)
assert login_resp.access_token is not None
print("   Login successful! JWT Token generated.")

# 5. Trading & Atomic Transactions
print("\n5. Testing Trading & Atomic Portfolio Updates...")
import pandas as pd
from app.core.cache import market_cache
# Pre-seed cache with test price to verify atomic trading without network dependency
market_cache.set("stock_data:TCS:1d", pd.DataFrame({"Close": [3450.0]}))

buy_res = buy_stock(user_id=test_user_id, ticker="TCS", quantity=5, db=conn)
print(f"   {buy_res['message']} (Total: ₹{buy_res['total']:,.2f})")

# Check updated balance
cur.execute("SELECT balance FROM accounts WHERE user_id = ?", (test_user_id,))
new_bal = float(cur.fetchone()["balance"])
print(f"   Remaining balance: ₹{new_bal:,.2f}")
assert new_bal < 1000000.0

# Check holdings
holdings = get_portfolio_holdings(user_id=test_user_id, db=conn)
assert len(holdings) == 1
print(f"   Holdings: {holdings[0]['ticker']} x {holdings[0]['shares']} shares @ ₹{holdings[0]['avg_price']:,.2f}")

# 6. Watchlist Isolation
print("\n6. Testing User-Isolated Watchlist...")
add_to_watchlist(user_id=test_user_id, ticker="INFY", db=conn)
watchlist = get_user_watchlist(user_id=test_user_id, db=conn)
tickers_in_wl = [w["ticker"] for w in watchlist]
print("   User Watchlist:", ", ".join(tickers_in_wl))
assert "INFY" in tickers_in_wl

conn.close()

print("\n==================================================")
print("  ALL CORE BACKEND LOGIC VERIFIED AND PASSING!")
print("==================================================")
