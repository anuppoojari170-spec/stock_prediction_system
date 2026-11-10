from fastapi import APIRouter

from app.api.v1.endpoints import auth, market, prediction, stream, trading, watchlist

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(market.router)
api_router.include_router(trading.router)
api_router.include_router(prediction.router)
api_router.include_router(watchlist.router)
api_router.include_router(stream.router)

