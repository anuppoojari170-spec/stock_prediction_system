import React, { useState } from "react";
import {
  Bookmark,
  Search,
  Plus,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export const WatchlistView: React.FC = () => {
  const {
    watchlists,
    setActiveTicker,
    setOrderSide,
    setActiveTab,
    toggleWatchlistPin,
    removeFromWatchlist,
    addToWatchlist,
  } = useAppStore();

  const [selectedCat, setSelectedCat] = useState<string>("NIFTY 50");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTickerInput, setNewTickerInput] = useState<string>("");

  const currentList = watchlists[selectedCat] || [];

  const filteredItems = currentList.filter(
    (item) =>
      item.ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleAddNewSecurity = () => {
    if (!newTickerInput.trim()) return;
    const clean = newTickerInput.trim().toUpperCase();
    addToWatchlist({
      ticker: clean,
      companyName: `${clean} Equity`,
      pinned: false,
      price: 1250.00,
      change_abs: 15.20,
      change_pct: 1.23,
      volume: "1.5M",
      sparkline: [1230, 1238, 1242, 1248, 1250],
    });
    setNewTickerInput("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4 select-none">
      <div className="nexus-card p-4">
        {/* Header & Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#26354B]">
          <div className="flex items-center space-x-2">
            <Bookmark size={18} className="text-[#386BFF]" />
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Institutional Market Watchlists ({filteredItems.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search within watchlist..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs font-medium">
              {Object.keys(watchlists).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1 rounded transition-colors ${
                    selectedCat === cat
                      ? "bg-[#386BFF] text-white"
                      : "text-[#94A3B8] hover:text-[#F1F5FC]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-xs font-semibold flex items-center space-x-1 shadow-sm"
            >
              <Plus size={14} />
              <span>Add Stock</span>
            </button>
          </div>
        </div>

        {/* Watchlist Full Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
                <th className="py-2.5 px-3">Pin</th>
                <th className="py-2.5 px-3">Security</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Change (₹)</th>
                <th className="py-2.5 px-3 text-right">Change %</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-center">Trend (5D)</th>
                <th className="py-2.5 px-3 text-center">Trade Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
              {filteredItems.map((item) => {
                const isUp = item.change_abs >= 0;

                return (
                  <tr key={item.ticker} className="hover:bg-[#1A2940]/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => toggleWatchlistPin(item.ticker)}
                        className={`p-1 rounded transition-colors ${
                          item.pinned ? "text-[#F5B942]" : "text-[#64748B] hover:text-[#F5B942]"
                        }`}
                      >
                        <Star size={14} fill={item.pinned ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td
                      onClick={() => {
                        setActiveTicker(item.ticker);
                        setActiveTab("markets");
                      }}
                      className="py-2.5 px-3 cursor-pointer group"
                    >
                      <div className="font-bold text-[#F1F5FC] group-hover:text-[#386BFF] transition-colors">
                        {item.ticker}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] font-sans">
                        {item.companyName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#F1F5FC]">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={isUp ? "text-[#00C087]" : "text-[#F04452]"}>
                        {isUp ? "+" : ""}₹{item.change_abs.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span
                        className={`inline-flex items-center space-x-0.5 ${
                          isUp ? "text-[#00C087]" : "text-[#F04452]"
                        }`}
                      >
                        {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        <span>
                          {isUp ? "+" : ""}
                          {item.change_pct.toFixed(2)}%
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                      {item.volume}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.sparkline && (
                        <div className="w-16 h-5 mx-auto">
                          <svg className="w-full h-full" viewBox="0 0 64 20">
                            <polyline
                              fill="none"
                              stroke={isUp ? "#00C087" : "#F04452"}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              points={item.sparkline
                                .map((val, idx) => {
                                  const min = Math.min(...item.sparkline!);
                                  const max = Math.max(...item.sparkline!);
                                  const range = max - min || 1;
                                  const x = (idx / (item.sparkline!.length - 1)) * 64;
                                  const y = 18 - ((val - min) / range) * 16;
                                  return `${x},${y}`;
                                })
                                .join(" ")}
                            />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => {
                            setActiveTicker(item.ticker);
                            setOrderSide("BUY");
                            setActiveTab("overview");
                          }}
                          className="px-2.5 py-1 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-[11px] font-bold shadow-sm"
                        >
                          BUY
                        </button>
                        <button
                          onClick={() => {
                            setActiveTicker(item.ticker);
                            setOrderSide("SELL");
                            setActiveTab("overview");
                          }}
                          className="px-2.5 py-1 rounded bg-[#F04452] hover:bg-[#ff5a68] text-white text-[11px] font-bold shadow-sm"
                        >
                          SELL
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(item.ticker)}
                          className="p-1 rounded text-[#94A3B8] hover:text-[#F04452]"
                          title="Remove from list"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111C30] border border-[#26354B] rounded-lg max-w-sm w-full p-5 shadow-2xl">
            <h3 className="font-heading font-bold text-base text-[#F1F5FC] mb-1">
              Add Security to {selectedCat}
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Enter Indian stock symbol (e.g. BAJFINANCE, WIPRO, LT).
            </p>

            <input
              type="text"
              placeholder="e.g. WIPRO"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded text-sm uppercase font-mono text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
            />

            <div className="flex space-x-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded text-xs font-medium bg-[#1A2940] text-[#94A3B8] hover:text-[#F1F5FC]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewSecurity}
                className="flex-1 py-2 rounded text-xs font-semibold bg-[#386BFF] hover:bg-[#4C7DFF] text-white shadow-md shadow-[#386BFF]/20"
              >
                Add Security
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
