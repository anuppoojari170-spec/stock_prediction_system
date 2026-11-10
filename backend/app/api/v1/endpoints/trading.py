import sqlite3
from typing import List
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.trading import (
    HoldingOut,
    OrderRequest,
    OrderResponse,
    PortfolioSummary,
    TransactionOut,
)
from app.services.trading import (
    buy_stock,
    get_portfolio_holdings,
    get_portfolio_summary,
    get_user_transactions,
    sell_stock,
)

router = APIRouter(prefix="/trading", tags=["Paper Trading & Portfolio"])


@router.post("/buy", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def execute_buy(
    order: OrderRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Execute a virtual BUY order at live market price for the authenticated user."""
    return buy_stock(
        user_id=current_user["id"],
        ticker=order.ticker,
        quantity=order.quantity,
        db=db,
    )


@router.post("/sell", response_model=OrderResponse)
def execute_sell(
    order: OrderRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Execute a virtual SELL order at live market price for the authenticated user."""
    return sell_stock(
        user_id=current_user["id"],
        ticker=order.ticker,
        quantity=order.quantity,
        db=db,
    )


@router.get("/portfolio", response_model=List[HoldingOut])
def get_portfolio(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch enriched portfolio holdings with live prices and real-time unrealized P&L."""
    return get_portfolio_holdings(user_id=current_user["id"], db=db)


@router.get("/summary", response_model=PortfolioSummary)
def get_summary(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Retrieve user portfolio metrics (balance, total invested, current value, total P&L, today's P&L)."""
    return get_portfolio_summary(user_id=current_user["id"], db=db)


@router.get("/transactions", response_model=List[TransactionOut])
def get_transactions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Retrieve paginated transaction history for the authenticated user."""
    return get_user_transactions(user_id=current_user["id"], db=db, limit=limit)

