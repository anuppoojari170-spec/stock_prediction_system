import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { marketApi } from "../../services/api";

const popularStocks = [
  { ticker: "RELIANCE", name: "Reliance Industries Ltd", price: 1339.70, changePct: 0.00 },
  { ticker: "TCS", name: "Tata Consultancy Services", price: 2407.50, changePct: -1.43 },
  { ticker: "INFY", name: "Infosys Limited", price: 1141.50, changePct: -0.84 },
  { ticker: "HDFCBANK", name: "HDFC Bank Limited", price: 804.00, changePct: -1.02 },
  { ticker: "ICICIBANK", name: "ICICI Bank Limited", price: 1583.60, changePct: -0.40 },
  { ticker: "BHARTIARTL", name: "Bharti Airtel Limited", price: 2106.00, changePct: 0.48 },
  { ticker: "SBIN", name: "State Bank of India", price: 1080.00, changePct: -0.60 },
  { ticker: "LT", name: "Larsen & Toubro Ltd", price: 4143.80, changePct: -0.37 },
];


export const TopNavbar: React.FC = () => {
  const {
    theme,
    setTheme,
    activeTicker,
    setActiveTicker,
    wsStatus,
    liveTicks,
  } = useAppStore();

  const activeTick = liveTicks[activeTicker?.toUpperCase()];

  const { user, openAuthModal, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout();
    queryClient.clear();
  };

  // Search flyout state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ ticker: string; companyName: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification menu state
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  // IST Clock & Market Status state
  const [currentTime, setCurrentTime] = useState("");
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " IST"
      );

      // Check Indian market trading hours (Mon-Fri 09:15 - 15:30 IST)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000);
      const day = istDate.getDay();
      if (day === 0 || day === 6) {
        setIsMarketOpen(false);
      } else {
        const timeVal = istDate.getHours() * 60 + istDate.getMinutes();
        setIsMarketOpen(timeVal >= 9 * 60 + 15 && timeVal <= 15 * 60 + 30);
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Debounced dynamic search across all 2,600+ NSE stocks
  useEffect(() => {
    const cleanQ = query.trim();
    if (!cleanQ) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    const timer = setTimeout(() => {
      marketApi
        .searchStocks(cleanQ, 15)
        .then((res) => {
          if (isMounted) {
            setSearchResults(res);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsSearching(false);
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Close search/notifs when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStock = (ticker: string) => {
    setActiveTicker(ticker);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <header className="h-16 bg-[#0D1627] border-b border-[#26354B] px-4 flex items-center justify-between select-none z-30 relative">
      {/* Left: Tagline & Market Status */}
      <div className="flex items-center space-x-4">
        <div className="hidden xl:flex flex-col">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#386BFF]">
            TRADE AI PILOT
          </span>
          <span className="text-xs text-[#94A3B8]">Trade Smarter. AI-Powered Precision.</span>
        </div>

        {/* Live IST Clock & Market Status */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#111C30] border border-[#26354B] text-xs font-mono text-[#94A3B8]">
            <span className={`w-2 h-2 rounded-full ${isMarketOpen ? "bg-[#00C087] animate-pulse" : "bg-[#F5B942]"}`}></span>
            <span>{currentTime || "09:15:00 IST"}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${
              isMarketOpen
                ? "bg-[#00C087]/15 text-[#00C087] border-[#00C087]/30"
                : "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30"
            }`}
          >
            {isMarketOpen ? "MARKET OPEN" : "AFTER HOURS"}
          </span>
        </div>

        {/* WebSocket Live Stream Indicator */}
        <div
          className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs font-mono ${
            wsStatus === "connected"
              ? "bg-[#00C087]/10 text-[#00C087] border-[#00C087]/30"
              : wsStatus === "connecting"
              ? "bg-[#F5B942]/10 text-[#F5B942] border-[#F5B942]/30"
              : "bg-[#F04452]/10 text-[#F04452] border-[#F04452]/30"
          }`}
          title={`Market streaming server: ${wsStatus}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wsStatus === "connected"
                ? "bg-[#00C087] animate-pulse"
                : wsStatus === "connecting"
                ? "bg-[#F5B942] animate-ping"
                : "bg-[#F04452]"
            }`}
          />
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            {wsStatus === "connected" ? "LIVE STREAM" : wsStatus === "connecting" ? "SYNCING..." : "OFFLINE"}
          </span>
        </div>

        {/* Active Loaded Stock Fast-Pill */}
        {activeTick && (
          <div className="hidden 2xl:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#111C30] border border-[#26354B] text-xs">
            <span className="font-bold text-[#F1F5FC]">{activeTick.ticker}</span>
            <span
              className={`font-mono-numbers font-semibold ${
                activeTick.direction === "up"
                  ? "text-[#00C087] flash-up"
                  : activeTick.direction === "down"
                  ? "text-[#F04452] flash-down"
                  : "text-[#F1F5FC]"
              }`}
            >
              ₹{activeTick.price.toFixed(2)}
            </span>
            <span
              className={`font-mono-numbers text-[11px] ${
                activeTick.change >= 0 ? "text-[#00C087]" : "text-[#F04452]"
              }`}
            >
              {activeTick.change >= 0 ? "+" : ""}
              {activeTick.change_pct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Center: Global Search Bar */}
      <div ref={searchRef} className="relative w-72 md:w-96 lg:w-[420px]">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search stocks (e.g. RELIANCE, TCS, INFY)..."
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            className="w-full bg-[#111C30] border border-[#26354B] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:outline-none focus:border-[#386BFF] transition-colors"
          />
          <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-[#1A2940] text-[10px] font-mono text-[#64748B] border border-[#26354B]">
            /
          </span>
        </div>

        {/* Dropdown Search Results */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111C30] border border-[#26354B] rounded-lg shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-2 text-[11px] font-semibold text-[#94A3B8] border-b border-[#26354B] uppercase tracking-wider bg-[#0B1120] flex items-center justify-between">
              <span>{query.trim() ? "NSE Search Results" : "Top Traded Indian Stocks"}</span>
              <span className="text-[9px] font-mono text-[#386BFF]">2,600+ Stocks</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {query.trim() ? (
                isSearching ? (
                  <div className="p-4 text-center text-xs text-[#94A3B8] flex items-center justify-center space-x-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#386BFF] border-t-transparent rounded-full animate-spin" />
                    <span>Searching NSE database...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((stock) => {
                    const live = liveTicks[stock.ticker];
                    return (
                      <div
                        key={stock.ticker}
                        onClick={() => handleSelectStock(stock.ticker)}
                        className="flex items-center justify-between px-3 py-2 hover:bg-[#1A2940] cursor-pointer transition-colors border-b border-[#26354B]/30 last:border-b-0"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-[#F1F5FC] flex items-center space-x-1.5">
                            <span>{stock.ticker}</span>
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#1A2940] text-[#386BFF] border border-[#26354B]">
                              NSE
                            </span>
                          </div>
                          <div className="text-[10px] text-[#94A3B8] truncate max-w-[240px]">
                            {stock.companyName}
                          </div>
                        </div>
                        {live ? (
                          <div className="text-right font-mono-numbers flex-shrink-0">
                            <div className="text-xs font-medium text-[#F1F5FC]">
                              ₹{live.price.toFixed(2)}
                            </div>
                            <div
                              className={`text-[10px] font-semibold ${
                                live.change_pct >= 0 ? "text-[#00C087]" : "text-[#F04452]"
                              }`}
                            >
                              {live.change_pct >= 0 ? "+" : ""}
                              {live.change_pct.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#64748B] font-mono flex-shrink-0">
                            Select Stock
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-[#94A3B8]">
                    No matching NSE securities found for "{query}".
                  </div>
                )
              ) : (
                popularStocks.map((stock) => {
                  const live = liveTicks[stock.ticker];
                  const displayPrice = live ? live.price : stock.price;
                  const displayPct = live ? live.change_pct : stock.changePct;
                  const isUp = displayPct >= 0;

                  return (
                    <div
                      key={stock.ticker}
                      onClick={() => handleSelectStock(stock.ticker)}
                      className="flex items-center justify-between px-3 py-2 hover:bg-[#1A2940] cursor-pointer transition-colors border-b border-[#26354B]/30 last:border-b-0"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#F1F5FC]">
                          {stock.ticker}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">{stock.name}</div>
                      </div>
                      <div className="text-right font-mono-numbers">
                        <div className="text-xs font-medium text-[#F1F5FC]">
                          ₹{displayPrice.toFixed(2)}
                        </div>
                        <div
                          className={`text-[10px] font-semibold ${
                            isUp ? "text-[#00C087]" : "text-[#F04452]"
                          }`}
                        >
                          {isUp ? "+" : ""}
                          {displayPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Theme Toggle, Notifications, User Profile */}
      <div className="flex items-center space-x-3">
        {/* Light / Dark Theme Switcher */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#111C30] border border-transparent hover:border-[#26354B] transition-colors"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#111C30] relative border border-transparent hover:border-[#26354B] transition-colors"
            title="Market Alerts"
          >
            <Bell size={17} />
            {hasUnreadNotifs && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#386BFF]"></span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26354B] rounded-md shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#26354B]">
                <span className="text-xs font-semibold text-[#F1F5FC]">
                  Market Alerts & Updates
                </span>
                {hasUnreadNotifs ? (
                  <button
                    onClick={() => setHasUnreadNotifs(false)}
                    className="text-[10px] text-[#386BFF] hover:underline"
                  >
                    Mark all read
                  </button>
                ) : (
                  <span className="text-[10px] text-[#00C087] font-medium">All caught up</span>
                )}
              </div>
              <div className="space-y-2.5 mt-2.5 max-h-60 overflow-y-auto text-xs">
                <div className="p-2 rounded bg-[#0B1120] border border-[#26354B]/50 flex items-start space-x-2">
                  <CheckCircle2 size={15} className="text-[#00C087] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[#F1F5FC] font-medium text-[11px]">
                      NIFTY 50 Touches Intraday High
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Index crosses 24,350 led by Banking & Energy heavyweights.
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0B1120] border border-[#26354B]/50 flex items-start space-x-2">
                  <AlertCircle size={15} className="text-[#386BFF] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[#F1F5FC] font-medium text-[11px]">
                      RBI Monetary Policy Update
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Repo rate remains unchanged at 6.50% with neutral stance.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account / Login */}
        {user ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#1A2940] border border-[#386BFF] flex items-center justify-center text-xs font-bold text-[#F1F5FC]">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-[#94A3B8] hover:text-[#F04452] transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal("login")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-xs font-medium shadow-md shadow-[#386BFF]/20 transition-all"
          >
            <UserIcon size={14} />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
