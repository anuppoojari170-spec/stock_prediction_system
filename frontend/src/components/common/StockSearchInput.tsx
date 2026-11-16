import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { marketApi } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";

interface StockSearchInputProps {
  value: string;
  onChange: (ticker: string) => void;
  onSelect?: (ticker: string) => void;
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
  showChips?: boolean;
  autoFocus?: boolean;
}

const DEFAULT_POPULAR = [
  { ticker: "RELIANCE", name: "Reliance Industries Ltd", price: 1339.70 },
  { ticker: "TCS", name: "Tata Consultancy Services", price: 2407.50 },
  { ticker: "INFY", name: "Infosys Limited", price: 1141.50 },
  { ticker: "HDFCBANK", name: "HDFC Bank Limited", price: 804.00 },
  { ticker: "ICICIBANK", name: "ICICI Bank Limited", price: 1583.60 },
  { ticker: "SBIN", name: "State Bank of India", price: 1080.00 },
  { ticker: "TATAMOTORS", name: "Tata Motors Limited", price: 287.40 },
  { ticker: "BHARTIARTL", name: "Bharti Airtel Limited", price: 2106.00 },
  { ticker: "ITC", name: "ITC Limited", price: 285.00 },
  { ticker: "BSE", name: "BSE Limited (Exchange Equity)", price: 2680.00 },
  { ticker: "NIFTYBEES", name: "Nippon India Nifty 50 ETF", price: 284.50 },
  { ticker: "LT", name: "Larsen & Toubro Ltd", price: 4143.80 },
];

const POPULAR_CHIPS = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ICICIBANK",
  "BHARTIARTL",
  "SBIN",
  "TATAMOTORS",
  "ITC",
];

export const StockSearchInput: React.FC<StockSearchInputProps> = ({
  value,
  onChange,
  onSelect,
  onSubmit,
  label = "Target Stock Symbol",
  placeholder = "Search 2,600+ NSE stocks (e.g. IDFC, Tata)",
  showChips = true,
  autoFocus = false,
}) => {
  const { liveTicks } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [searchResults, setSearchResults] = useState<{ ticker: string; companyName: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search across all 2,600+ NSE equities
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
        .searchStocks(cleanQ, 12)
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

  const handleSelect = (ticker: string) => {
    const sym = ticker.toUpperCase();
    setQuery(sym);
    onChange(sym);
    if (onSelect) {
      onSelect(sym);
    }
    setDropdownOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
          {label}
        </label>
      )}

      {/* Input Field with Search Icon */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
        />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onFocus={() => setDropdownOpen(true)}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setQuery(val);
            onChange(val);
            setDropdownOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (searchResults.length > 0 && dropdownOpen) {
                handleSelect(searchResults[0].ticker);
              }
              if (onSubmit) {
                onSubmit();
              }
            } else if (e.key === "Escape") {
              setDropdownOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-8 pr-7 py-2 bg-[#0B1120] border border-[#26354B] rounded text-xs font-mono font-bold text-[#F1F5FC] placeholder-[#64748B] focus:outline-none focus:border-[#386BFF] transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5FC] transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Popular Quick Chips */}
      {showChips && (
        <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto no-scrollbar">
          {POPULAR_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSelect(chip)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                value === chip
                  ? "bg-[#386BFF] text-white font-bold"
                  : "bg-[#162238] text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1E2E48]"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Flyout Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#111C30] border border-[#26354B] rounded-lg shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A3B8] border-b border-[#26354B] uppercase tracking-wider bg-[#0B1120] flex items-center justify-between">
            <span>{query.trim() ? "NSE Search Results" : "Popular Indian Large-Caps"}</span>
            <span className="text-[9px] font-mono text-[#386BFF]">2,600+ Stocks</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {query.trim() ? (
              isSearching ? (
                <div className="p-3 text-center text-xs text-[#94A3B8] flex items-center justify-center space-x-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#386BFF] border-t-transparent rounded-full animate-spin" />
                  <span>Searching NSE database...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((stock) => {
                  const live = liveTicks[stock.ticker];
                  return (
                    <div
                      key={stock.ticker}
                      onClick={() => handleSelect(stock.ticker)}
                      className="flex items-center justify-between px-3 py-2 hover:bg-[#1A2940] cursor-pointer transition-colors border-b border-[#26354B]/30 last:border-b-0"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-[#F1F5FC] flex items-center space-x-1.5">
                          <span>{stock.ticker}</span>
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#1A2940] text-[#386BFF] border border-[#26354B]">
                            NSE
                          </span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] truncate max-w-[200px]">
                          {stock.companyName}
                        </div>
                      </div>

                      {live ? (
                        <div className="text-right font-mono text-xs flex-shrink-0">
                          <div className="font-semibold text-[#F1F5FC]">
                            ₹{live.price.toFixed(2)}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              live.change_pct >= 0 ? "text-[#00C087]" : "text-[#F04452]"
                            }`}
                          >
                            {live.change_pct >= 0 ? "+" : ""}
                            {live.change_pct.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#386BFF] font-mono flex-shrink-0 font-semibold">
                          Select →
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-[#94A3B8]">
                  No matching NSE securities found for "{query}".
                </div>
              )
            ) : (
              DEFAULT_POPULAR.map((stock) => {
                const live = liveTicks[stock.ticker];
                const displayPrice = live ? live.price : stock.price;
                const isUp = live ? live.change_pct >= 0 : true;

                return (
                  <div
                    key={stock.ticker}
                    onClick={() => handleSelect(stock.ticker)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[#1A2940] cursor-pointer transition-colors border-b border-[#26354B]/30 last:border-b-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F1F5FC] flex items-center space-x-1.5">
                        <span>{stock.ticker}</span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#1A2940] text-[#386BFF] border border-[#26354B]">
                          NSE
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">{stock.name}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="font-semibold text-[#F1F5FC]">
                        ₹{displayPrice.toFixed(2)}
                      </div>
                      {live && (
                        <div
                          className={`text-[10px] font-bold ${
                            isUp ? "text-[#00C087]" : "text-[#F04452]"
                          }`}
                        >
                          {isUp ? "+" : ""}
                          {live.change_pct.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

