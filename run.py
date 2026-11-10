"""
Entry point for the TradePilot AI backend.

Run this from the project root with:
    python run.py

It starts the Flask development server defined in api/app.py on
http://127.0.0.1:5001. Open frontend/index.html in a browser (or serve it
with any static file server) to use the application.
"""

import os
import sys

# Make the api/ package importable when running from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

from app import app  # noqa: E402

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n========================================================")
    print(f"  TradePilot AI Platform is running!")
    print(f"  Access the web app at: http://127.0.0.1:{port}")
    print(f"========================================================\n")
    app.run(debug=True, port=port)
