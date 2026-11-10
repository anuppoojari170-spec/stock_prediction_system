import os
import sys
import uvicorn

# Ensure the backend directory is in the Python module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    port = int(os.environ.get("PORT", 8000))
    print(f"\n========================================================")
    print(f"  TradePilot AI — FastAPI Modern Backend")
    print(f"  Interactive OpenAPI Docs: http://127.0.0.1:{port}/docs")
    print(f"  API Endpoint:            http://127.0.0.1:{port}/api/v1")
    print(f"========================================================\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True, app_dir=backend_dir)

