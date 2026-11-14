import React, { useState, useEffect } from "react";
import {
  Search,
  Star,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  FolderPlus,
  Layers,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../../store/useAppStore";
import { watchlistApi } from "../../services/api";
import { WatchlistItem, WatchlistCategoryOut } from "../../types";
import { CirclingLoader } from "../common/CirclingLoader";

export const WatchlistWidget: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    activeTicker,
    setActiveTicker,
    openOrderModal,
    liveTicks,
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [showNewCatModal, setShowNewCatModal] = useState<boolean>(false);
  const [newTickerInput, setNewTickerInput] = useState<string>("");
  const [newCatNameInput, setNewCatNameInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingTicker, setDeletingTicker] = useState<string | null>(null);

  // 1. Fetch user's custom database categories
  const { data: categories = [], isLoading: isCatLoading } = useQuery<WatchlistCategoryOut[]>({
    queryKey: ["userWatchlistCategories"],
    queryFn: watchlistApi.getCategories,
    refetchInterval: 15000,
  });

  // Sync activeCategory when categories load or change
  useEffect(() => {
    if (categories.length > 0) {
      if (!activeCategory || !categories.some((c) => c.name === activeCategory)) {
        setActiveCategory(categories[0].name);
      }
    } else {
      setActiveCategory("");
    }
  }, [categories, activeCategory]);

  // 2. Fetch items for the active category
  const { data: currentList = [], isLoading: isListLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["userWatchlistItems", activeCategory],
    queryFn: () => (activeCategory ? watchlistApi.getList(activeCategory) : Promise.resolve([])),
    enabled: !!activeCategory,
    refetchInterval: 8000,
  });

  const filteredItems = currentList.filter(
    (item) =>
      item.ticker.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.companyName &&
        item.companyName.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const handleTogglePin = async (ticker: string) => {
    if (!activeCategory) return;
    try {
      await watchlistApi.togglePin(ticker, activeCategory);
      queryClient.invalidateQueries({
        queryKey: ["userWatchlistItems", activeCategory],
      });
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const handleRemove = async (ticker: string) => {
    if (!activeCategory) return;
    setDeletingTicker(ticker);
    try {
      await watchlistApi.remove(ticker, activeCategory);
      queryClient.invalidateQueries({
        queryKey: ["userWatchlistItems", activeCategory],
      });
    } catch (err) {
      console.error("Failed to remove stock:", err);
    } finally {
      setDeletingTicker(null);
    }
  };

  const handleAddSecurity = async () => {
    if (!newTickerInput.trim() || !activeCategory) return;
    const clean = newTickerInput.trim().toUpperCase();
    setIsSubmitting(true);
    try {
      await watchlistApi.add(clean, activeCategory);
      queryClient.invalidateQueries({
        queryKey: ["userWatchlistItems", activeCategory],
      });
      setNewTickerInput("");
      setShowAddStockModal(false);
    } catch (err) {
      console.error("Failed to add to database watchlist:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatNameInput.trim()) return;
    const cleanName = newCatNameInput.trim();
    setIsSubmitting(true);
    try {
      await watchlistApi.createCategory(cleanName);
      await queryClient.invalidateQueries({
        queryKey: ["userWatchlistCategories"],
      });
      setActiveCategory(cleanName);
      setNewCatNameInput("");
      setShowNewCatModal(false);
    } catch (err) {
      console.error("Failed to create watchlist category:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (!window.confirm(`Delete watchlist "${catName}"?`)) return;
    try {
      await watchlistApi.deleteCategory(catName);
      await queryClient.invalidateQueries({
        queryKey: ["userWatchlistCategories"],
      });
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  return (
    <div className="nexus-card flex flex-col p-4 select-none">
      {/* Category Tabs Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#26354B]">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar max-w-[calc(100%-60px)]">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center group relative">
              <button
                onClick={() => setActiveCategory(cat.name)}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
                  activeCategory === cat.name
                    ? "bg-[#386BFF] text-white"
                    : "text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940]"
                }`}
              >
                <span>{cat.name}</span>
                {cat.count !== undefined && (
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    activeCategory === cat.name ? "bg-white/20 text-white" : "bg-[#26354B] text-[#94A3B8]"
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
              {activeCategory === cat.name && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 text-[#94A3B8] hover:text-[#F04452] transition-opacity"
                  title={`Delete ${cat.name}`}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
          {categories.length === 0 && !isCatLoading && (
            <span className="text-xs text-[#64748B] italic">No watchlists</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* New Category Button */}
          <button
            onClick={() => setShowNewCatModal(true)}
            className="p-1 rounded text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-colors"
            title="Create New Custom Watchlist"
          >
            <FolderPlus size={15} />
          </button>

          {/* Add Stock to Active Category Button */}
          {activeCategory && (
            <button
              onClick={() => setShowAddStockModal(true)}
              className="p-1 rounded text-[#94A3B8] hover:text-[#00C087] hover:bg-[#1A2940] transition-colors"
              title={`Add Stock to ${activeCategory}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* When user has no watchlists at all */}
      {categories.length === 0 && !isCatLoading ? (
        <div className="py-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#1A2940] flex items-center justify-center mx-auto text-[#386BFF]">
            <Layers size={20} />
          </div>
          <div className="text-xs text-[#94A3B8] max-w-[200px] mx-auto">
            You don't have any watchlists yet. Create one to start tracking your stocks.
          </div>
          <button
            onClick={() => setShowNewCatModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-xs font-semibold shadow-md shadow-[#386BFF]/20"
          >
            <Plus size={13} />
            <span>Create Watchlist</span>
          </button>
        </div>
      ) : (
        <>
          {/* In-list Search Filter */}
          <div className="relative mt-2.5 mb-2">
            <Search size={14} className="absolute left-2.5 top-2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={`Filter ${activeCategory || "watchlist"}...`}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] placeholder-[#64748B] focus:outline-none focus:border-[#386BFF]"
            />
          </div>

          {/* Watchlist Items Scrollable List */}
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {isListLoading ? (
              <div className="py-8 flex flex-col items-center justify-center">
                <CirclingLoader size="sm" label={`Loading ${activeCategory || "watchlist"}...`} />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-xs text-[#94A3B8]">
                  {filterQuery
                    ? "No stocks match your filter."
                    : `No stocks in "${activeCategory}".`}
                </div>
                {!filterQuery && (
                  <button
                    onClick={() => setShowAddStockModal(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1A2940] hover:bg-[#26354B] text-[11px] text-[#386BFF] font-medium"
                  >
                    <Plus size={12} />
                    <span>Add Stocks</span>
                  </button>
                )}
              </div>
            ) : (
              filteredItems.map((item) => {
                const live = liveTicks[item.ticker.toUpperCase()];
                const price = live ? live.price : (item.price || 1000.0);
                const changePct = live ? live.change_pct : (item.change_pct || 0);
                const isUp = (live ? live.change : item.change_abs || 0) >= 0;
                const flashClass = live
                  ? live.direction === "up"
                    ? "flash-up"
                    : live.direction === "down"
                    ? "flash-down"
                    : ""
                  : "";
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
                          handleTogglePin(item.ticker);
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
                          {item.companyName || `${item.ticker} Limited`}
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
                      <div
                        key={`${item.ticker}-${price}`}
                        className={`text-xs font-semibold px-1 py-0.5 rounded transition-colors ${flashClass} text-[#F1F5FC]`}
                      >
                        ₹{price.toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] font-medium flex items-center justify-end space-x-0.5 ${
                          isUp ? "text-[#00C087]" : "text-[#F04452]"
                        }`}
                      >
                        {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        <span>
                          {isUp ? "+" : ""}
                          {changePct.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Hover Quick Action Buttons: Buy / Sell / Trash */}
                    <div className="absolute right-2 inset-y-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1A2940] pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOrderModal(item.ticker, "BUY");
                        }}
                        className="px-2 py-1 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-[10px] font-bold"
                        title="Quick Buy Order"
                      >
                        B
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOrderModal(item.ticker, "SELL");
                        }}
                        className="px-2 py-1 rounded bg-[#F04452] hover:bg-[#ff5a68] text-white text-[10px] font-bold"
                        title="Quick Sell Order"
                      >
                        S
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.ticker);
                        }}
                        disabled={deletingTicker === item.ticker}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#F04452] disabled:opacity-50"
                        title="Remove from list"
                      >
                        {deletingTicker === item.ticker ? (
                          <CirclingLoader size="xs" color="text-[#F04452]" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-[#26354B] bg-[#111C30] p-5 shadow-2xl">
            <h4 className="font-heading font-bold text-sm text-[#F1F5FC] mb-1">
              Add Stock to {activeCategory}
            </h4>
            <p className="text-xs text-[#94A3B8] mb-3">
              Enter the NSE symbol (e.g. RELIANCE, TCS, INFY, SBIN, TATAMOTORS).
            </p>

            <input
              type="text"
              placeholder="e.g. RELIANCE"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSecurity();
              }}
              autoFocus
              className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] uppercase font-mono-numbers focus:outline-none focus:border-[#386BFF] mb-3"
            />

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setNewTickerInput("");
                }}
                disabled={isSubmitting}
                className="flex-1 py-1.5 rounded bg-[#1A2940] hover:bg-[#26354B] text-xs text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSecurity}
                disabled={isSubmitting || !newTickerInput.trim()}
                className="flex-1 py-1.5 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-xs font-semibold text-white shadow-md shadow-[#386BFF]/30 disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <CirclingLoader size="xs" color="text-white" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Security</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Category Modal */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-[#26354B] bg-[#111C30] p-5 shadow-2xl">
            <h4 className="font-heading font-bold text-sm text-[#F1F5FC] mb-1">
              Create New Watchlist
            </h4>
            <p className="text-xs text-[#94A3B8] mb-3">
              Give your new custom watchlist a name (e.g. Bluechips, High Growth, Swing Trades).
            </p>

            <input
              type="text"
              placeholder="e.g. High Growth"
              value={newCatNameInput}
              onChange={(e) => setNewCatNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCategory();
              }}
              autoFocus
              className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF] mb-3"
            />

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowNewCatModal(false);
                  setNewCatNameInput("");
                }}
                disabled={isSubmitting}
                className="flex-1 py-1.5 rounded bg-[#1A2940] hover:bg-[#26354B] text-xs text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isSubmitting || !newCatNameInput.trim()}
                className="flex-1 py-1.5 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-xs font-semibold text-white shadow-md shadow-[#386BFF]/30 disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <CirclingLoader size="xs" color="text-white" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
