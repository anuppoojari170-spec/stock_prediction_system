import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.api.v1.endpoints.stream import websocket_market_stream
from app.core.config import settings
from app.db.session import init_db
from app.services.market_streamer import market_streamer

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and indexes exist
    init_db()
    # Start high-frequency real-time market streaming engine
    market_streamer.start()
    yield
    # Shutdown logic
    market_streamer.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Modern Full-Stack Trading Platform API with Multi-User Authentication, High-Speed Caching & Financial Analytics.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include master API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Direct root WebSocket endpoint for market streaming
@app.websocket("/ws/market/stream")
@app.websocket("/ws/stream")
async def root_market_stream(websocket: WebSocket):
    await websocket_market_stream(websocket)


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# Mount static assets and serve React SPA if frontend/dist exists
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Don't intercept API routes, WebSockets or documentation
        if full_path.startswith("api/") or full_path.startswith("ws/") or full_path in ("docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404)
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/", tags=["Health"])
    def root():
        return {
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "Online",
            "docs": "/docs",
            "api_v1": settings.API_V1_STR,
        }

