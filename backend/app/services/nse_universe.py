import csv
import json
import logging
import os
import re
from typing import Dict, List, Optional, Tuple
import urllib.request

logger = logging.getLogger("TradeAIPilot.NSEUniverse")

NSE_EQUITY_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
CACHE_FILE = os.path.join(DATA_DIR, "nse_equities.json")


# Popular brand aliases for Indian companies whose official listed name or symbol differs from their consumer brand
POPULAR_BRAND_ALIASES: Dict[str, str] = {
    "ZOMATO": "ETERNAL",
    "BLINKIT": "ETERNAL",
    "AIRTEL": "BHARTIARTL",
    "L&T": "LT",
    "LARSEN": "LT",
    "M&M": "M&M",
    "MAHINDRA": "M&M",
    "JIO": "JIOFIN",
    "JIOFINANCIAL": "JIOFIN",
    "PAYTM": "PAYTM",
}


class NSEUniverseService:
    """
    Dynamic NSE Stock Universe Manager.
    Automatically maintains and searches the complete list of all 2,600+ equities
    listed on the National Stock Exchange of India (NSE), eliminating hardcoded lists.
    """

    def __init__(self):
        self.stocks: Dict[str, str] = {}  # SYMBOL -> Full Company Name
        self.normalized_names: Dict[str, str] = {}  # Clean Name -> SYMBOL
        self._load_or_fetch_universe()

    def _load_or_fetch_universe(self):
        """Load from local cache if exists, otherwise fetch official CSV from NSE India."""
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    self.stocks = json.load(f)
                self._build_normalized_index()
                logger.info(f"Loaded {len(self.stocks)} NSE equities from cache.")
                return
            except Exception as e:
                logger.warning(f"Failed to read cached NSE equities: {e}. Re-fetching...")

        self.refresh_from_nse()

    def refresh_from_nse(self) -> int:
        """Download latest official equity list directly from National Stock Exchange of India."""
        try:
            req = urllib.request.Request(
                NSE_EQUITY_URL,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                lines = resp.read().decode("utf-8").splitlines()
                reader = csv.reader(lines)
                header = next(reader, None)
                stocks = {}
                for row in reader:
                    if len(row) >= 2:
                        sym = row[0].strip().upper()
                        name = row[1].strip()
                        if sym:
                            stocks[sym] = name

                if stocks:
                    self.stocks = stocks
                    with open(CACHE_FILE, "w", encoding="utf-8") as f:
                        json.dump(stocks, f, indent=2)
                    self._build_normalized_index()
                    logger.info(f"Successfully refreshed {len(self.stocks)} NSE equities.")
                    return len(self.stocks)
        except Exception as e:
            logger.warning(f"Could not download EQUITY_L.csv from NSE: {e}")

        # Fallback starter set if offline/blocked
        if not self.stocks:
            self.stocks = {
                "RELIANCE": "Reliance Industries Limited",
                "TCS": "Tata Consultancy Services Limited",
                "INFY": "Infosys Limited",
                "HDFCBANK": "HDFC Bank Limited",
                "ICICIBANK": "ICICI Bank Limited",
                "SBIN": "State Bank of India",
                "IDFCFIRSTB": "IDFC First Bank Limited",
                "TATAMOTORS": "Tata Motors Limited",
                "WIPRO": "Wipro Limited",
                "ITC": "ITC Limited",
                "MARUTI": "Maruti Suzuki India Limited",
                "BAJFINANCE": "Bajaj Finance Limited",
                "BHARTIARTL": "Bharti Airtel Limited",
                "KOTAKBANK": "Kotak Mahindra Bank Limited",
                "LT": "Larsen & Toubro Limited",
            }
            self._build_normalized_index()

        return len(self.stocks)

    def _build_normalized_index(self):
        """Index cleaned company names for instant fuzzy lookup."""
        self.normalized_names = {}
        for sym, name in self.stocks.items():
            clean = self._clean_name(name)
            self.normalized_names[clean] = sym
            # Also index without common business words
            simplified = re.sub(r"\b(limited|ltd|corporation|corp|india|industries|holdings|services)\b", "", clean).strip()
            if simplified and len(simplified) >= 3:
                self.normalized_names[simplified] = sym

    def _clean_name(self, text: str) -> str:
        """Strip punctuation and normalize spacing."""
        text = text.lower()
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        return " ".join(text.split())

    def resolve_ticker(self, user_query: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Dynamically resolve ANY company name or stock symbol from user text
        against the complete 2,600+ NSE equity universe.
        Returns: (ticker_symbol, company_full_name)
        """
        if not user_query:
            return None, None

        # 1. Exact ticker symbol match in query tokens (e.g. 'IDFCFIRSTB', 'TCS', 'MRF')
        tokens = re.findall(r"\b[A-Za-z0-9&]{2,14}\b", user_query)
        for tok in tokens:
            up = tok.upper()
            if up in self.stocks:
                return up, self.stocks[up]

        # 2. Company name matching across the full NSE universe
        clean_query = self._clean_name(user_query)

        # Match longest matching company name first
        best_sym = None
        best_name = None
        best_len = 0

        for clean_name, sym in self.normalized_names.items():
            if len(clean_name) >= 3 and clean_name in clean_query:
                if len(clean_name) > best_len:
                    best_sym = sym
                    best_name = self.stocks.get(sym, clean_name.title())
                    best_len = len(clean_name)

        if best_sym:
            return best_sym, best_name

        # 3. Dynamic Web Search Fallback via Yahoo Finance
        web_sym = self._search_web_for_ticker(user_query)
        if web_sym:
            return web_sym, self.stocks.get(web_sym, web_sym)

        return None, None

    def _search_web_for_ticker(self, query: str) -> Optional[str]:
        """Query web search API dynamically if not directly found in local index."""
        try:
            encoded = urllib.parse.quote(query)
            url = f"https://query2.finance.yahoo.com/v1/finance/search?q={encoded}&quotesCount=5&newsCount=0"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for q in data.get("quotes", []):
                    sym = q.get("symbol", "")
                    if sym.endswith(".NS") or sym.endswith(".BO"):
                        clean_sym = sym.replace(".NS", "").replace(".BO", "")
                        return clean_sym
        except Exception:
            pass
        return None

    def search_equities(self, query: str, limit: int = 15) -> List[Dict[str, str]]:
        """Search auto-complete endpoint for user interface."""
        if not query or len(query.strip()) < 1:
            return []

        q = query.strip().upper()
        q_lower = query.strip().lower()
        matches = []

        # Check brand aliases (e.g. ZOMATO -> ETERNAL, AIRTEL -> BHARTIARTL)
        for alias, target_sym in POPULAR_BRAND_ALIASES.items():
            if alias.startswith(q) or q in alias:
                if target_sym in self.stocks and not any(m["ticker"] == target_sym for m in matches):
                    matches.append({"ticker": target_sym, "companyName": f"{self.stocks[target_sym]} ({alias.title()})"})

        # Exact prefix on symbol first
        for sym, name in self.stocks.items():
            if sym.startswith(q) and not any(m["ticker"] == sym for m in matches):
                matches.append({"ticker": sym, "companyName": name})
                if len(matches) >= limit:
                    return matches

        # Substring in company name
        for sym, name in self.stocks.items():
            if q_lower in name.lower() and not any(m["ticker"] == sym for m in matches):
                matches.append({"ticker": sym, "companyName": name})
                if len(matches) >= limit:
                    return matches

        return matches


nse_universe = NSEUniverseService()

