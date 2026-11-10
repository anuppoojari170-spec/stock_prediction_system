import React, { useState } from "react";
import {
  Search,
  Star,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export const WatchlistWidget: React.FC = () => {
  const {
    watchlists,
    activeTicker,
    setActiveTicker,
    setOrderSide,
    toggleWatchlistPin,
    removeFromWatchlist,
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<string>("NIFTY 50");
  const [filterQuery, setFilterQuery] = useState<string>("");

  const currentList = watchlists[activeCategory] || [];

  const filteredItems = currentList.filter(
    (item) =>
      item.ticker.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.companyName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="nexus-card flex flex-col p-4 select-none">
      {/* Category Tabs Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#26354B]">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {Object.keys(watchlists).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-[#386BFF] text-white"
                  : "text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          className="p-1 rounded text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-colors"
          title="Add New Security to Watchlist"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* In-list Search Filter */}
      <div className="relative mt-2.5 mb-2">
        <Search size={14} className="absolute left-2.5 top-2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Filter watchlist..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] placeholder-[#64748B] focus:outline-none focus:border-[#386BFF]"
        />
      </div>

      {/* Watchlist Items Scrollable List */}
      <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
        {filteredItems.map((item) => {
          const isUp = item.change_abs >= 0;
          const isSelected = activeTicker === item.ticker;

          return (
            <div
              key={item.ticker}
              onClick={() => setActiveTicker(item.ticker)}
              className={`p-2 rounded flex items-center justify-between cursor-pointer transition-all border group relative ${
                isSelected
                  ? "bg-[#1A2940] border-[#386BFF]"
                  : "bg-[#0D1627]/40 border-transparent hover:bg-[#1A2940]/60 hover:border-[#26354B]"
              }`}
            >
              {/* Left: Star Pin, Symbol & Company */}
              <div className="flex items-center space-x-2 truncate">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlistPin(item.ticker);
                  }}
                  className={`p-0.5 rounded transition-colors ${
                    item.pinned
                      ? "text-[#F5B942]"
                      : "text-[#64748B] opacity-0 group-hover:opacity-100"
                  }`}
                  title={item.pinned ? "Unpin stock" : "Pin stock to top"}
                >
                  <Star size={13} fill={item.pinned ? "currentColor" : "none"} />
                </button>

                <div className="truncate">
                  <div className="text-xs font-bold text-[#F1F5FC] truncate">
                    {item.ticker}
                  </div>
                  <div className="text-[10px] text-[#94A3B8] truncate max-w-[110px]">
                    {item.companyName}
                  </div>
                </div>
              </div>

              {/* Center: Mini Sparkline SVG */}
              {item.sparkline && (
                <div className="hidden sm:block w-14 h-5">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 56 20">
                    <polyline
                      fill="none"
                      stroke={isUp ? "#00C087" : "#F04452"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={item.sparkline
                        .map((val, idx) => {
                          const min = Math.min(...item.sparkline!);
                          const max = Math.max(...item.sparkline!);
                          const range = max - min || 1;
                          const x = (idx / (item.sparkline!.length - 1)) * 56;
                          const y = 18 - ((val - min) / range) * 16;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  </svg>
                </div>
              )}

              {/* Right: LTP & Percentage Change */}
              <div className="text-right font-mono-numbers">
                <div className="text-xs font-semibold text-[#F1F5FC]">
                  ₹{item.price.toFixed(2)}
                </div>
                <div
                  className={`text-[10px] font-medium flex items-center justify-end space-x-0.5 ${
                    isUp ? "text-[#00C087]" : "text-[#F04452]"
                  }`}
                >
                  {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  <span>
                    {isUp ? "+" : ""}
                    {item.change_pct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Hover Quick Action Buttons: Buy / Sell */}
              <div className="absolute right-2 inset-y-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1A2940] pl-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTicker(item.ticker);
                    setOrderSide("BUY");
                  }}
                  className="px-2 py-1 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-[10px] font-bold"
                  title="Quick Buy"
                >
                  B
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTicker(item.ticker);
                    setOrderSide("SELL");
                  }}
                  className="px-2 py-1 rounded bg-[#F04452] hover:bg-[#ff5a68] text-white text-[10px] font-bold"
                  title="Quick Sell"
                >
                  S
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(item.ticker);
                  }}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#F04452]"
                  title="Remove from list"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
