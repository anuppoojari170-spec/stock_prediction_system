"""
Optional ML model trainer for TradePilot AI.

The live app's prediction signal (api/predictor.py) intentionally uses a
transparent moving-average crossover rule — it is fast, needs no training,
and is easy to explain in a demo or interview ("MA5 crosses above MA20 ->
bullish").

This script is a separate, supplementary track: it trains a real
scikit-learn / XGBoost classifier on technical indicators to predict
next-day price direction, and saves the fitted model + scaler to this
folder as saved_model.pkl / scaler.pkl. It is not wired into the live API
by default, so the demo never depends on a trained artifact being present.
To use the ML model's predictions in the API instead of the MA rule, see
the "Wiring this into the API" note at the bottom of this file.

Usage:
    python models/train_model.py TCS          # train on one stock
    python models/train_model.py TCS INFY WIPRO   # train on several, pooled
"""

import sys
import os
import joblib
import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")


def fetch_history(ticker, period="2y"):
    stock = yf.Ticker(ticker + ".NS")
    df = stock.history(period=period)
    if df.empty:
        raise ValueError(f"No data returned for {ticker}")
    return df


def build_features(df):
    """Engineer simple technical-indicator features from OHLCV data."""
    out = pd.DataFrame(index=df.index)

    close = df["Close"]
    out["ma5"] = close.rolling(5).mean()
    out["ma10"] = close.rolling(10).mean()
    out["ma20"] = close.rolling(20).mean()
    out["ma5_ma20_gap"] = (out["ma5"] - out["ma20"]) / out["ma20"]

    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    out["rsi14"] = 100 - (100 / (1 + rs))

    out["volatility10"] = close.pct_change().rolling(10).std()
    out["momentum5"] = close.pct_change(5)
    out["volume_change"] = df["Volume"].pct_change().rolling(5).mean()

    # Target: did price go up the next day?
    out["target"] = (close.shift(-1) > close).astype(int)

    return out.dropna()


def train(tickers):
    frames = []
    for ticker in tickers:
        print(f"Fetching history for {ticker}...")
        df = fetch_history(ticker)
        features = build_features(df)
        frames.append(features)

    data = pd.concat(frames, axis=0)
    feature_cols = [c for c in data.columns if c != "target"]

    X = data[feature_cols].values
    y = data["target"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=3,
        learning_rate=0.05,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    preds = model.predict(X_test_scaled)
    print("\nHold-out accuracy:", round(accuracy_score(y_test, preds), 4))
    print(classification_report(y_test, preds, target_names=["DOWN", "UP"]))

    joblib.dump({"model": model, "feature_cols": feature_cols}, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nSaved model to {MODEL_PATH}")
    print(f"Saved scaler to {SCALER_PATH}")


if __name__ == "__main__":
    tickers = sys.argv[1:] or ["TCS"]
    train(tickers)


# ---------------------------------------------------------------------------
# Wiring this into the API (optional)
# ---------------------------------------------------------------------------
# api/predictor.py currently predicts using a moving-average crossover rule.
# To use this trained model instead, you would:
#   1. Run this script to produce saved_model.pkl and scaler.pkl
#   2. In api/predictor.py, load both files with joblib.load() at import time
#   3. In predict_stock(), build the same feature set with build_features()
#      on the latest data, scale it, and call model.predict_proba()
#   4. Map the probability to a signal/confidence the same way the current
#      MA-based logic does, so the rest of the app (UI, routes) needs no
#      changes.
# This is left as a clearly-scoped extension rather than wired in by
# default, so the live demo never silently breaks if no model has been
# trained yet.
