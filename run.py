"""
Entry point for Trade AI Pilot modern FastAPI backend.

Run this from the project root with:
    python3 run.py
"""

import os
import sys
import uvicorn

# Ensure the backend directory is in the Python module search path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print("\n========================================================")
    print("  Trade AI Pilot — Institutional NSE/BSE Trading Terminal")
    print(f"  Interactive OpenAPI Docs: http://127.0.0.1:{port}/docs")
    print(f"  API Endpoint:            http://127.0.0.1:{port}/api/v1")
    print("========================================================\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True, app_dir=backend_dir)
