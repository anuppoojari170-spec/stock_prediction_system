# TradePilot AI — Stock Trading Platform

A full-stack paper trading platform with AI-generated buy/sell signals,
a live market overview, portfolio analytics, and a Zerodha/Groww/TradingView-
inspired dark UI. Built with Flask, SQLite, and vanilla JavaScript + Chart.js
— no frontend build step required.

![Status](https://img.shields.io/badge/status-demo-00d97e)

## Highlights

- **AI stock signals** — BUY / SELL / HOLD with a confidence score, risk
  meter, and a five-level recommendation (STRONG BUY → STRONG SELL), driven
  by a transparent moving-average crossover model (MA5 vs MA20).
- **Paper trading** — buy and sell at live market prices pulled from
  Yahoo Finance, with a virtual ₹10,00,000 starting balance.
- **Portfolio analytics** — live unrealized P&L per holding, total
  invested vs current value, growth %, and today's P&L.
- **Market overview** — NIFTY 50, SENSEX, and BANK NIFTY snapshots, a
  bullish/neutral/bearish sentiment gauge, and top gainers/losers across a
  tracked basket of large-cap NSE stocks.
- **AI Trading Assistant** — plain-language insights generated from the
  same prediction logic (no external AI API calls).
- **Floating assistant widget** — quick-action chat bubble for "today's
  movers", "market sentiment", "what's bullish", and portfolio P&L.
- **Watchlist** — persisted server-side, with pin and remove actions.
- **Trading statistics** — total trades, win/loss counts, and win rate
  computed from real transaction history.
- **Toast notifications, animated charts, and a fully responsive layout**
  (desktop, tablet, mobile).

## Project Structure

```
stock_prediction_system/
├── api/
│   ├── app.py          # Flask routes (thin — delegates to the modules below)
│   ├── database.py     # SQLite schema, connection, activity logging
│   ├── predictor.py     # AI signal logic, market overview, movers, sentiment
│   └── trading.py        # Buy/sell execution, portfolio P&L, trading stats
├── frontend/
│   ├── index.html        # App shell
│   ├── style.css         # Dark theme, layout, components, animations
│   └── app.js          # All client-side logic (fetch calls, rendering, UI)
├── models/
│   └── train_model.py    # Optional ML model trainer (see note below)
├── data/
│   └── stock_data.db     # SQLite database (created automatically on first run)
├── requirements.txt
├── run.py                # Entry point — starts the Flask server
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the backend

```bash
python run.py
```

This starts the Flask API on `http://127.0.0.1:5000` and creates
`data/stock_data.db` automatically on first run, seeded with a ₹10,00,000
paper-trading balance and a starter watchlist (TCS, INFY, WIPRO).

### 3. Open the frontend

Open `frontend/index.html` directly in a browser, or serve it with any
static file server, e.g.:

```bash
cd frontend
python -m http.server 8080
```

Then visit `http://127.0.0.1:8080`.

> The frontend talks to the API at `http://127.0.0.1:5000` (see the `API`
> constant at the top of `frontend/app.js`). Update it if you deploy the
> backend elsewhere.

## How the AI signal works

`api/predictor.py` pulls recent price history for a ticker and computes two
moving averages — a 5-day and a 20-day. If the short-term average is above
the long-term average, momentum is reading bullish (**BUY**); if it's
below, momentum is bearish (**SELL**); otherwise it's a **HOLD**. The gap
between the two averages determines whether a BUY/SELL is upgraded to
STRONG BUY/STRONG SELL, and a rolling-volatility calculation produces the
risk meter (LOW/MEDIUM/HIGH). The same logic powers the AI Trading
Assistant panel and the market sentiment gauge (which aggregates signals
across a basket of stocks).

This is a deliberately simple, explainable rule — it's accurate and fast
enough for a live demo, and easy to reason about out loud. `models/
train_model.py` includes an optional, separate path for training a real
scikit-learn/XGBoost classifier on technical indicators if you want to
extend the project with a learned model; see the comments at the bottom of
that file for how to wire it into the API.

## API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Balance, holdings, transaction count, P&L summary |
| POST | `/api/predict` | `{ ticker }` → AI signal, confidence, risk, recommendation |
| GET | `/api/history/<ticker>` | 1-month OHLC history for the chart |
| GET | `/api/quote/<ticker>` | Latest live price for a ticker |
| GET | `/api/assistant?tickers=...` | Plain-language insights for given tickers |
| GET | `/api/market-overview` | NIFTY 50 / SENSEX / BANK NIFTY snapshot |
| GET | `/api/movers` | Top gainers / losers across the tracked universe |
| GET | `/api/sentiment` | Aggregate bullish/neutral/bearish market sentiment |
| POST | `/api/buy` | `{ ticker, quantity }` → executes a buy at live price |
| POST | `/api/sell` | `{ ticker, quantity }` → executes a sell at live price |
| GET | `/api/portfolio` | Holdings as `[ticker, shares, avg_price]` rows |
| GET | `/api/portfolio/detailed` | Holdings enriched with live price + P&L |
| GET | `/api/portfolio/summary` | Total invested, current value, P&L, growth % |
| GET | `/api/stats` | Total trades, win/loss counts, win rate |
| GET | `/api/account` | Current balance |
| GET | `/api/transactions` | Transaction history |
| GET / POST | `/api/watchlist` | List / add a watchlist symbol |
| DELETE | `/api/watchlist/<ticker>` | Remove a symbol from the watchlist |
| POST | `/api/watchlist/<ticker>/pin` | Toggle pin on a watchlist symbol |
| GET | `/api/activity` | Recent activity feed |

## Tech Stack

**Backend:** Flask, SQLite, yfinance, pandas
**Frontend:** HTML, CSS, vanilla JavaScript, Chart.js
**Optional ML track:** scikit-learn, XGBoost (see `models/train_model.py`)

## Notes

- All trades execute at the live market price fetched via yfinance at the
  moment of the trade — there is no simulated or fixed price.
- This is a **paper trading** platform. No real money or real brokerage
  connection is involved.
- The tracked stock universe (used for movers, sentiment, and the AI
  assistant) is a fixed basket of well-known NSE large-caps, kept small so
  demo runs stay fast and reliable.
