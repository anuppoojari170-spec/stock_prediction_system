import sqlite3
from typing import List
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.trading import WatchlistCreate, WatchlistItem
from app.services.trading import (
    add_to_watchlist,
    get_user_watchlist,
    remove_from_watchlist,
    toggle_pin_watchlist,
)

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.get("", response_model=List[WatchlistItem])
def list_watchlist(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch user's tracked watchlist ordered by pinned status."""
    return get_user_watchlist(user_id=current_user["id"], db=db)


@router.post("", status_code=status.HTTP_201_CREATED)
def add_symbol(
    item: WatchlistCreate,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Add a stock symbol to the user's watchlist."""
    add_to_watchlist(user_id=current_user["id"], ticker=item.ticker, db=db)
    return {"message": f"{item.ticker.upper()} added to watchlist"}


@router.delete("/{ticker}")
def delete_symbol(
    ticker: str,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Remove a symbol from the user's watchlist."""
    remove_from_watchlist(user_id=current_user["id"], ticker=ticker, db=db)
    return {"message": f"{ticker.upper()} removed from watchlist"}


@router.post("/{ticker}/pin")
def pin_symbol(
    ticker: str,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Toggle pin state on a watchlist symbol."""
    is_pinned = toggle_pin_watchlist(user_id=current_user["id"], ticker=ticker, db=db)
    return {"ticker": ticker.upper(), "pinned": is_pinned}

