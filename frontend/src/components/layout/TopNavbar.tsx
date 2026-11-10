import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Zap,
  ShieldCheck,
  Wallet,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { ExchangeType } from "../../types";

const popularStocks = [
  { ticker: "RELIANCE", name: "Reliance Industries Ltd", price: 2984.50, changePct: 1.30 },
  { ticker: "TCS", name: "Tata Consultancy Services", price: 4120.75, changePct: 1.11 },
  { ticker: "HDFCBANK", name: "HDFC Bank Limited", price: 1742.30, changePct: -0.48 },
  { ticker: "INFY", name: "Infosys Limited", price: 1865.10, changePct: 1.24 },
  { ticker: "ICICIBANK", name: "ICICI Bank Limited", price: 1268.90, changePct: 1.16 },
  { ticker: "BHARTIARTL", name: "Bharti Airtel Limited", price: 1595.60, changePct: 0.39 },
  { ticker: "SBIN", name: "State Bank of India", price: 818.40, changePct: -0.50 },
  { ticker: "TATAMOTORS", name: "Tata Motors Limited", price: 988.40, changePct: 1.29 },
];

export const TopNavbar: React.FC = () => {
  const {
    mode,
    setMode,
    theme,
    setTheme,
    exchange,
    setExchange,
    activeTicker,
    setActiveTicker,
    virtualBalance,
    setActiveTab,
    wsStatus,
    liveTicks,
  } = useAppStore();

  const activeTick = liveTicks[activeTicker?.toUpperCase()];

  const { user, openAuthModal, logout } = useAuthStore();

  // Search flyout state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification menu state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // IST Clock state
  const [currentTime, setCurrentTime] = useState("");

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
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const filteredStocks = popularStocks.filter(
    (s) =>
      s.ticker.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectStock = (ticker: string) => {
    setActiveTicker(ticker);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <header className="h-16 bg-[#0D1627] border-b border-[#26354B] px-4 flex items-center justify-between select-none z-30 relative">
      {/* Left: Tagline & Exchange Switcher */}
      <div className="flex items-center space-x-4">
        <div className="hidden xl:flex flex-col">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#386BFF]">
            TRADE AI PILOT
          </span>
          <span className="text-xs text-[#94A3B8]">Trade Smarter. AI-Powered Precision.</span>
        </div>

        {/* NSE / BSE Toggle Pill */}
        <div className="flex items-center p-0.5 bg-[#111C30] border border-[#26354B] rounded-md text-xs font-medium">
          {(["NSE", "BSE"] as ExchangeType[]).map((ex) => (
            <button
              key={ex}
              onClick={() => setExchange(ex)}
              className={`px-3 py-1 rounded transition-colors ${
                exchange === ex
                  ? "bg-[#386BFF] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Live IST Clock */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#111C30] border border-[#26354B] text-xs font-mono text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full bg-[#00C087]"></span>
          <span>{currentTime || "09:15:00 IST"}</span>
        </div>

        {/* Real-Time WebSocket Market Stream Indicator */}
        <div
          className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono border ${
            wsStatus === "connected"
              ? "bg-[#00C087]/10 border-[#00C087]/30 text-[#00C087]"
              : wsStatus === "connecting"
              ? "bg-[#F5B942]/10 border-[#F5B942]/30 text-[#F5B942]"
              : "bg-[#F04452]/10 border-[#F04452]/30 text-[#F04452]"
          }`}
          title={
            wsStatus === "connected"
              ? "Connected to live sub-second market data stream"
              : wsStatus === "connecting"
              ? "Connecting to market WebSocket stream..."
              : "Stream disconnected. Auto-reconnecting..."
          }
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
            className="w-full pl-9 pr-10 py-1.5 bg-[#111C30] border border-[#26354B] rounded-md text-xs text-[#F1F5FC] placeholder-[#64748B] focus:outline-none focus:border-[#386BFF] transition-colors"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 px-1.5 py-0.5 text-[10px] text-[#94A3B8] bg-[#1A2940] rounded border border-[#26354B]">
            /
          </kbd>
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#111C30] border border-[#26354B] rounded-md shadow-2xl overflow-hidden z-50">
            <div className="p-2 border-b border-[#26354B] text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              {query ? "Search Results" : "Top Traded Indian Stocks"}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock) => (
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
                        ₹{stock.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] font-semibold ${
                          stock.changePct >= 0 ? "text-[#00C087]" : "text-[#F04452]"
                        }`}
                      >
                        {stock.changePct >= 0 ? "+" : ""}
                        {stock.changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[#94A3B8]">
                  No matching NSE/BSE securities found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Mode Toggle, Theme Toggle, Notifications, Funds, User Profile */}
      <div className="flex items-center space-x-3">
        {/* Beginner / Pro Mode Pill */}
        <button
          onClick={() => setMode(mode === "pro" ? "beginner" : "pro")}
          className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
            mode === "pro"
              ? "bg-[#386BFF]/15 text-[#386BFF] border-[#386BFF]/40"
              : "bg-[#7657F6]/15 text-[#7657F6] border-[#7657F6]/40"
          }`}
          title="Toggle Beginner / Pro Interface"
        >
          {mode === "pro" ? <Zap size={13} /> : <ShieldCheck size={13} />}
          <span>{mode === "pro" ? "PRO MODE" : "BEGINNER"}</span>
        </button>

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
          >
            <Bell size={17} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#386BFF]"></span>
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26354B] rounded-md shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#26354B]">
                <span className="text-xs font-semibold text-[#F1F5FC]">
                  Market Alerts & Updates
                </span>
                <span className="text-[10px] text-[#386BFF] cursor-pointer hover:underline">
                  Mark all read
                </span>
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

        {/* Virtual Available Funds Pill */}
        <div
          onClick={() => setActiveTab("funds")}
          className="hidden md:flex items-center space-x-2 px-3 py-1 bg-[#111C30] hover:bg-[#1A2940] border border-[#26354B] rounded-md cursor-pointer transition-colors"
          title="Click to view Funds & Margin"
        >
          <Wallet size={15} className="text-[#386BFF]" />
          <div className="flex flex-col text-left font-mono-numbers">
            <span className="text-[10px] text-[#94A3B8] uppercase font-sans">
              Margin Avail.
            </span>
            <span className="text-xs font-semibold text-[#F1F5FC]">
              ₹
              {virtualBalance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* User Account / Login */}
        {user ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#1A2940] border border-[#386BFF] flex items-center justify-center text-xs font-bold text-[#F1F5FC]">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
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
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
