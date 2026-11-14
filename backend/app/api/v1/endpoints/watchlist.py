import sqlite3
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.trading import (
    WatchlistCategoryCreate,
    WatchlistCategoryOut,
    WatchlistCreate,
    WatchlistItem,
)
from app.services.trading import (
    add_to_watchlist,
    create_user_watchlist_category,
    delete_user_watchlist_category,
    get_user_watchlist,
    get_user_watchlist_categories,
    remove_from_watchlist,
    toggle_pin_watchlist,
)

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.get("/categories", response_model=List[WatchlistCategoryOut])
def list_watchlist_categories(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch all custom watchlist categories/groups created by the user."""
    return get_user_watchlist_categories(user_id=current_user["id"], db=db)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_watchlist_category(
    cat_in: WatchlistCategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Create a new custom watchlist category for the authenticated user."""
    create_user_watchlist_category(user_id=current_user["id"], name=cat_in.name, db=db)
    return {"message": f"Watchlist '{cat_in.name}' created"}


@router.delete("/categories/{name}")
def delete_watchlist_category(
    name: str,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Delete a custom watchlist category and all stocks inside it."""
    delete_user_watchlist_category(user_id=current_user["id"], name=name, db=db)
    return {"message": f"Watchlist '{name}' deleted"}


@router.get("", response_model=List[WatchlistItem])
def list_watchlist(
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch user's tracked watchlist ordered by pinned status."""
    return get_user_watchlist(user_id=current_user["id"], db=db, category=category)


@router.post("", status_code=status.HTTP_201_CREATED)
def add_symbol(
    item: WatchlistCreate,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Add a stock symbol to the user's selected watchlist."""
    cat = item.category or "Watchlist 1"
    add_to_watchlist(user_id=current_user["id"], ticker=item.ticker, category=cat, db=db)
    return {"message": f"{item.ticker.upper()} added to '{cat}'"}


@router.delete("/{ticker}")
def delete_symbol(
    ticker: str,
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Remove a symbol from the user's selected watchlist."""
    remove_from_watchlist(user_id=current_user["id"], ticker=ticker, category=category, db=db)
    return {"message": f"{ticker.upper()} removed from watchlist"}


@router.post("/{ticker}/pin")
def pin_symbol(
    ticker: str,
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Toggle pin state on a watchlist symbol."""
    is_pinned = toggle_pin_watchlist(user_id=current_user["id"], ticker=ticker, category=category, db=db)
    return {"ticker": ticker.upper(), "pinned": is_pinned}
