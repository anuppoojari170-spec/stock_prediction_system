import React, { useState } from "react";
import {
  Bookmark,
  Search,
  Plus,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  RefreshCw,
  FolderPlus,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../../store/useAppStore";
import { watchlistApi } from "../../services/api";
import { WatchlistItem } from "../../types";

const popularSuggestions = [
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

export const WatchlistView: React.FC = () => {
  const queryClient = useQueryClient();
  const { setActiveTicker, setOrderSide, setActiveTab, liveTicks } = useAppStore();

  const [selectedCat, setSelectedCat] = useState<string>("Watchlist 1");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCreateCatModal, setShowCreateCatModal] = useState<boolean>(false);
  const [newTickerInput, setNewTickerInput] = useState<string>("");
  const [newCatInput, setNewCatInput] = useState<string>("");

  // 1. Fetch user's custom watchlist categories from backend database
  const {
    data: categories = [],
    isLoading: loadingCats,
  } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["watchlistCategories"],
    queryFn: () => watchlistApi.getCategories(),
    refetchInterval: 15000,
  });

  // Keep selected category valid
  const effectiveCat =
    categories.length > 0
      ? categories.some((c) => c.name === selectedCat)
        ? selectedCat
        : categories[0].name
      : selectedCat;

  // 2. Fetch stocks in the active category from backend database
  const {
    data: watchlistItems = [],
    isLoading: loadingItems,
    refetch: refetchItems,
    isRefetching,
  } = useQuery<WatchlistItem[]>({
    queryKey: ["userWatchlist", effectiveCat],
    queryFn: () => watchlistApi.getList(effectiveCat),
    enabled: categories.length > 0 || Boolean(effectiveCat),
    refetchInterval: 10000,
  });

  const filteredItems = watchlistItems.filter(
    (item) =>
      item.ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.companyName &&
        item.companyName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  // Handlers for Categories
  const handleCreateCategory = async () => {
    const clean = newCatInput.trim();
    if (!clean) return;
    try {
      await watchlistApi.createCategory(clean);
      await queryClient.invalidateQueries({ queryKey: ["watchlistCategories"] });
      setSelectedCat(clean);
      setNewCatInput("");
      setShowCreateCatModal(false);
    } catch (err) {
      console.error("Failed to create watchlist category:", err);
    }
  };

  const handleDeleteCategory = async (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete watchlist "${catName}" and all stocks in it?`)) return;
    try {
      await watchlistApi.deleteCategory(catName);
      await queryClient.invalidateQueries({ queryKey: ["watchlistCategories"] });
      await queryClient.invalidateQueries({ queryKey: ["userWatchlist"] });
    } catch (err) {
      console.error("Failed to delete watchlist category:", err);
    }
  };

  // Handlers for Stocks
  const handleAddNewSecurity = async (tickerToAdd?: string) => {
    const symbol = (tickerToAdd || newTickerInput).trim().toUpperCase();
    if (!symbol) return;

    try {
      await watchlistApi.add(symbol, effectiveCat);
      await queryClient.invalidateQueries({ queryKey: ["userWatchlist", effectiveCat] });
      await queryClient.invalidateQueries({ queryKey: ["watchlistCategories"] });
      setNewTickerInput("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add stock to watchlist:", err);
    }
  };

  const handleTogglePin = async (ticker: string) => {
    try {
      await watchlistApi.togglePin(ticker, effectiveCat);
      await queryClient.invalidateQueries({ queryKey: ["userWatchlist", effectiveCat] });
    } catch (err) {
      console.error("Failed to pin stock:", err);
    }
  };

  const handleRemove = async (ticker: string) => {
    try {
      await watchlistApi.remove(ticker, effectiveCat);
      await queryClient.invalidateQueries({ queryKey: ["userWatchlist", effectiveCat] });
      await queryClient.invalidateQueries({ queryKey: ["watchlistCategories"] });
    } catch (err) {
      console.error("Failed to remove stock:", err);
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="nexus-card p-4">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#26354B]">
          <div className="flex items-center space-x-2">
            <Bookmark size={18} className="text-[#386BFF]" />
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              {categories.length > 0 ? effectiveCat : "Watchlists"} ({filteredItems.length})
            </h3>
            <button
              onClick={() => refetchItems()}
              className="p-1 rounded text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-colors"
              title="Refresh Watchlist Data"
            >
              <RefreshCw size={13} className={isRefetching ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              />
            </div>

            {/* Custom Watchlist Tabs */}
            <div className="flex items-center space-x-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs font-medium overflow-x-auto no-scrollbar max-w-full">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => setSelectedCat(cat.name)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded cursor-pointer transition-all ${
                    effectiveCat === cat.name
                      ? "bg-[#386BFF] text-white shadow-sm"
                      : "text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940]"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({cat.count})</span>
                  {categories.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteCategory(cat.name, e)}
                      className="p-0.5 rounded hover:bg-black/30 hover:text-white"
                      title="Delete Watchlist"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}

              {/* Add New Watchlist Tab */}
              <button
                onClick={() => setShowCreateCatModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded text-[#386BFF] hover:bg-[#1A2940] transition-colors"
                title="Create New Watchlist"
              >
                <Plus size={13} />
                <span className="text-[11px] font-semibold">New Watchlist</span>
              </button>
            </div>

            {categories.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-xs font-medium shadow-md shadow-[#386BFF]/20 transition-all"
              >
                <Plus size={14} />
                <span>Add Stock</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State: If user has 0 watchlists created yet */}
        {categories.length === 0 && !loadingCats ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1A2940] border border-[#26354B] flex items-center justify-center text-[#386BFF]">
              <FolderPlus size={24} />
            </div>
            <h4 className="text-sm font-bold text-[#F1F5FC] mb-1">
              You Don't Have Any Watchlists Yet
            </h4>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto mb-4">
              Create custom watchlists to track individual stocks across Indian equity markets (NSE/BSE).
            </p>
            <button
              onClick={() => setShowCreateCatModal(true)}
              className="px-4 py-2 rounded-lg bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-xs font-semibold shadow-lg shadow-[#386BFF]/25 transition-all inline-flex items-center space-x-1.5"
            >
              <Plus size={15} />
              <span>Create Your First Watchlist</span>
            </button>
          </div>
        ) : (
          /* Watchlist Table */
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
                  <th className="py-2.5 px-3 text-center">Trade Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#94A3B8]">
                      {loadingItems ? (
                        "Loading watchlist..."
                      ) : (
                        <div className="space-y-2">
                          <p>This watchlist is empty.</p>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-3 py-1.5 rounded bg-[#1A2940] hover:bg-[#26354B] text-[#386BFF] text-xs font-medium border border-[#386BFF]/30 inline-flex items-center space-x-1"
                          >
                            <Plus size={13} />
                            <span>Add Stocks to {effectiveCat}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const live = liveTicks[item.ticker.toUpperCase()];
                    const price = live ? live.price : (item.price || 1000.0);
                    const change_abs = live ? live.change : (item.change_abs || 0);
                    const change_pct = live ? live.change_pct : (item.change_pct || 0);
                    const isUp = (change_abs ?? 0) >= 0;

                    return (
                      <tr key={item.ticker} className="hover:bg-[#1A2940]/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleTogglePin(item.ticker)}
                            className={`p-1 rounded transition-colors ${
                              item.pinned ? "text-[#F5B942]" : "text-[#64748B] hover:text-[#F5B942]"
                            }`}
                            title={item.pinned ? "Unpin stock" : "Pin stock to top"}
                          >
                            <Star size={14} fill={item.pinned ? "currentColor" : "none"} />
                          </button>
                        </td>
                        <td
                          onClick={() => {
                            setActiveTicker(item.ticker);
                            setActiveTab("overview");
                          }}
                          className="py-2.5 px-3 cursor-pointer group"
                        >
                          <div className="font-bold text-[#F1F5FC] group-hover:text-[#386BFF] transition-colors">
                            {item.ticker}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] font-sans">
                            {item.companyName || `${item.ticker} Limited`}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#F1F5FC]">
                          ₹{price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={isUp ? "text-[#00C087]" : "text-[#F04452]"}>
                            {isUp ? "+" : ""}₹{change_abs.toFixed(2)}
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
                              {change_pct.toFixed(2)}%
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                          {item.volume || "2.4M"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5 font-sans">
                            <button
                              onClick={() => {
                                setActiveTicker(item.ticker);
                                setOrderSide("BUY");
                                setActiveTab("overview");
                              }}
                              className="px-2.5 py-1 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-[10px] font-semibold"
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => {
                                setActiveTicker(item.ticker);
                                setOrderSide("SELL");
                                setActiveTab("overview");
                              }}
                              className="px-2.5 py-1 rounded bg-[#F04452] hover:bg-[#ff5a68] text-white text-[10px] font-semibold"
                            >
                              Sell
                            </button>
                            <button
                              onClick={() => handleRemove(item.ticker)}
                              className="p-1 rounded text-[#94A3B8] hover:text-[#F04452] hover:bg-[#1A2940] transition-colors"
                              title="Remove from watchlist"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Create New Custom Watchlist */}
      {showCreateCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-[#26354B] bg-[#111C30] p-6 shadow-2xl">
            <h4 className="font-heading font-bold text-base text-[#F1F5FC] mb-1">
              Create New Watchlist
            </h4>
            <p className="text-xs text-[#94A3B8] mb-4">
              Enter a name for your new custom watchlist (e.g. Banking, Tech Giants, Swing Trades).
            </p>

            <input
              type="text"
              placeholder="Watchlist Name"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B1120] border border-[#26354B] rounded-lg text-sm text-[#F1F5FC] focus:outline-none focus:border-[#386BFF] mb-4"
              autoFocus
            />

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateCatModal(false)}
                className="flex-1 py-2 rounded-lg bg-[#1A2940] hover:bg-[#26354B] text-xs text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCatInput.trim()}
                className="flex-1 py-2 rounded-lg bg-[#386BFF] hover:bg-[#4C7DFF] text-xs font-semibold text-white shadow-md shadow-[#386BFF]/30 disabled:opacity-50"
              >
                Create Watchlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Security to Watchlist */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-[#26354B] bg-[#111C30] p-6 shadow-2xl">
            <h4 className="font-heading font-bold text-base text-[#F1F5FC] mb-1">
              Add Stock to {effectiveCat}
            </h4>
            <p className="text-xs text-[#94A3B8] mb-4">
              Enter any NSE symbol to add it into your custom watchlist.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">NSE Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. BAJFINANCE, RELIANCE, TCS"
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded-lg text-sm text-[#F1F5FC] uppercase font-mono-numbers focus:outline-none focus:border-[#386BFF]"
                  autoFocus
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <span className="text-[11px] text-[#94A3B8] block mb-1.5 font-medium">
                  Quick Add Popular Stocks:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popularSuggestions.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleAddNewSecurity(sym)}
                      className="px-2 py-1 bg-[#1A2940] hover:bg-[#386BFF]/20 hover:text-[#386BFF] text-[10px] text-[#94A3B8] rounded border border-[#26354B] transition-colors"
                    >
                      + {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg bg-[#1A2940] hover:bg-[#26354B] text-xs text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddNewSecurity()}
                  disabled={!newTickerInput.trim()}
                  className="flex-1 py-2 rounded-lg bg-[#386BFF] hover:bg-[#4C7DFF] text-xs font-semibold text-white shadow-md shadow-[#386BFF]/30 disabled:opacity-50"
                >
                  Add to Watchlist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
