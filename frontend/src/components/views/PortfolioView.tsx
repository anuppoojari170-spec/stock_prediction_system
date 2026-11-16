import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  PieChart,
} from "lucide-react";
import { useAppStore, isIndianMarketOpen } from "../../store/useAppStore";
import { tradingApi } from "../../services/api";
import { Holding } from "../../types";
import { CirclingLoader } from "../common/CirclingLoader";

const SECTOR_COLORS: Record<string, string> = {
  "Information Technology": "#386BFF",
  "Banking & Financials": "#7657F6",
  "Energy & Conglomerate": "#00C087",
  "Automotive": "#F5B942",
  "FMCG": "#38BDF8",
  "Healthcare & Pharma": "#EC4899",
  "Telecommunications": "#8B5CF6",
  "Metals & Mining": "#F97316",
  "Infrastructure & Engineering": "#6366F1",
  "Index Benchmark ETF": "#10B981",
  "Exchange & Market Venue": "#06B6D4",
  "Consumer Goods & Paints": "#A855F7",
  "Other / Diversified": "#64748B",
};

const KNOWN_STOCK_SECTORS: Record<string, string> = {
  RELIANCE: "Energy & Conglomerate",
  TCS: "Information Technology",
  INFY: "Information Technology",
  WIPRO: "Information Technology",
  HCLTECH: "Information Technology",
  LTIM: "Information Technology",
  HDFCBANK: "Banking & Financials",
  ICICIBANK: "Banking & Financials",
  SBIN: "Banking & Financials",
  KOTAKBANK: "Banking & Financials",
  AXISBANK: "Banking & Financials",
  BAJFINANCE: "Banking & Financials",
  BHARTIARTL: "Telecommunications",
  TATAMOTORS: "Automotive",
  MARUTI: "Automotive",
  ITC: "FMCG",
  HINDUNILVR: "FMCG",
  LT: "Infrastructure & Engineering",
  ASIANPAINT: "Consumer Goods & Paints",
  BSE: "Exchange & Market Venue",
  "NIFTY 50": "Index Benchmark ETF",
  NIFTY: "Index Benchmark ETF",
  NIFTYBEES: "Index Benchmark ETF",
  BANKBEES: "Banking & Financials",
  GOLDBEES: "Other / Diversified",
};

export const PortfolioView: React.FC = () => {
  const { openOrderModal, liveTicks } = useAppStore();
  const isMarketOpen = isIndianMarketOpen();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"pnl" | "value" | "ticker">("value");

  const { data: serverHoldings, isLoading: isPortfolioLoading } = useQuery<Holding[]>({
    queryKey: ["portfolioHoldingsList"],
    queryFn: tradingApi.getPortfolio,
    refetchInterval: 10000,
  });

  const rawHoldings = serverHoldings || [];

  // Enriched with live WebSocket ticks
  const enrichedHoldings = useMemo(() => {
    return rawHoldings.map((h) => {
      const live = liveTicks[h.ticker.toUpperCase()];
      const currentPrice = live ? live.price : (h.current_price || h.avg_price);
      const currentValue = Math.round(currentPrice * h.shares * 100) / 100;
      const pnl = Math.round((currentValue - h.invested) * 100) / 100;
      const pnlPct = h.invested > 0 ? Math.round((pnl / h.invested) * 10000) / 100 : 0.0;
      const dayPnl = live ? Math.round(live.change * h.shares * 100) / 100 : (h.day_pnl || 0);
      const dayPnlPct = live ? live.change_pct : (h.day_pnl_pct || 0);

      return {
        ...h,
        current_price: currentPrice,
        current_value: currentValue,
        pnl,
        pnl_pct: pnlPct,
        day_pnl: dayPnl,
        day_pnl_pct: dayPnlPct,
      };
    });
  }, [rawHoldings, liveTicks]);

  const totalInvested = enrichedHoldings.reduce((acc, h) => acc + h.invested, 0);
  const totalValue = enrichedHoldings.reduce((acc, h) => acc + h.current_value, 0);
  const totalPnl = totalValue - totalInvested;
  const growthPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const todaysPnl = enrichedHoldings.reduce((acc, h) => acc + (h.day_pnl || 0), 0);
  const todaysPnlPct = totalInvested > 0 ? (todaysPnl / totalInvested) * 100 : 0.0;

  // Dynamically compute real-time Sector & Asset Allocation from active portfolio holdings
  const sectorBreakdown = useMemo(() => {
    if (enrichedHoldings.length === 0 || totalValue <= 0) {
      return [];
    }

    const sectorValues: Record<string, number> = {};

    enrichedHoldings.forEach((h) => {
      const sym = h.ticker.toUpperCase();
      const rawSector = h.sector || KNOWN_STOCK_SECTORS[sym] || "Other / Diversified";

      let normalized = rawSector;
      const lower = rawSector.toLowerCase();
      if (lower.includes("tech") || lower.includes("software") || lower.includes("it")) {
        normalized = "Information Technology";
      } else if (lower.includes("bank") || lower.includes("finance")) {
        normalized = "Banking & Financials";
      } else if (lower.includes("auto")) {
        normalized = "Automotive";
      } else if (lower.includes("oil") || lower.includes("energy") || lower.includes("conglomerate")) {
        normalized = "Energy & Conglomerate";
      } else if (lower.includes("fmcg") || lower.includes("consumer") || lower.includes("food")) {
        normalized = "FMCG";
      } else if (lower.includes("etf") || lower.includes("index")) {
        normalized = "Index Benchmark ETF";
      } else if (lower.includes("telecom")) {
        normalized = "Telecommunications";
      } else if (lower.includes("pharma") || lower.includes("health")) {
        normalized = "Healthcare & Pharma";
      } else if (lower.includes("infra") || lower.includes("engineer")) {
        normalized = "Infrastructure & Engineering";
      } else if (lower.includes("metal") || lower.includes("steel")) {
        normalized = "Metals & Mining";
      }

      sectorValues[normalized] = (sectorValues[normalized] || 0) + (h.current_value || 0);
    });

    const items = Object.entries(sectorValues).map(([name, val], idx) => {
      const pct = Math.round((val / totalValue) * 1000) / 10;
      const palette = [
        "#386BFF", "#7657F6", "#00C087", "#F5B942", "#38BDF8",
        "#EC4899", "#8B5CF6", "#F97316", "#6366F1", "#10B981"
      ];
      const color = SECTOR_COLORS[name] || palette[idx % palette.length];
      return { name, value: val, pct, color };
    });

    items.sort((a, b) => b.pct - a.pct);
    return items;
  }, [enrichedHoldings, totalValue]);


  const filteredHoldings = enrichedHoldings
    .filter(
      (h) =>
        h.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.companyName && h.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "pnl") return b.pnl - a.pnl;
      if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
      return b.current_value - a.current_value;
    });


  return (
    <div className="space-y-4 select-none">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Total Investment</span>
          <div className="text-xl md:text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹{totalInvested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">
            In {enrichedHoldings.length} {enrichedHoldings.length === 1 ? "Equity Holding" : "Equity Holdings"}
          </span>

        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Current Valuation</span>
          <div className="text-xl md:text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span
            className={`text-[11px] mt-1 block font-mono-numbers ${
              todaysPnl >= 0 ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {todaysPnl >= 0 ? "+" : ""}₹{todaysPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Today ({todaysPnlPct >= 0 ? "+" : ""}{todaysPnlPct.toFixed(2)}%)
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Overall Profit / Loss</span>
          <div
            className={`text-xl md:text-2xl font-bold font-mono-numbers mt-1 ${
              totalPnl >= 0 ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span
            className={`text-[11px] mt-1 block font-mono-numbers ${
              growthPct >= 0 ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(2)}% Net Growth
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Today's P&L</span>
          <div
            className={`text-xl md:text-2xl font-bold font-mono-numbers mt-1 ${
              todaysPnl >= 0 ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {todaysPnl >= 0 ? "+" : ""}₹{todaysPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Live Unbooked Gain</span>
        </div>
      </div>

      {/* Sector Allocation Visual Bar */}
      <div className="nexus-card p-4">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#26354B]">
          <h3 className="font-heading font-bold text-sm text-[#F1F5FC] flex items-center space-x-2">
            <PieChart size={16} className="text-[#386BFF]" />
            <span>Sector & Asset Allocation</span>
          </h3>
          <span className="text-xs text-[#94A3B8] font-mono">
            {sectorBreakdown.length > 0
              ? `${sectorBreakdown.length} Active ${sectorBreakdown.length === 1 ? "Sector" : "Sectors"} • 100% Equity Exposure`
              : "0 Holdings • Cash Margin Available"}
          </span>
        </div>

        {sectorBreakdown.length > 0 ? (
          <>
            {/* Visual Multi-Color Bar */}
            <div className="w-full h-3 rounded-full bg-[#1A2940] flex overflow-hidden mb-3">
              {sectorBreakdown.map((s, idx) => (
                <div
                  key={idx}
                  className="h-full transition-all duration-500"
                  style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  title={`${s.name}: ₹${s.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${s.pct}%)`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono-numbers">
              {sectorBreakdown.map((s, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}></span>
                  <span className="text-[#94A3B8]">{s.name}:</span>
                  <span className="font-semibold text-[#F1F5FC]">{s.pct}%</span>
                  <span className="text-[10px] text-[#64748B]">
                    (₹{s.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })})
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-4 px-3 rounded-lg bg-[#0B1120] border border-[#26354B]/50 flex flex-col items-center justify-center space-y-1.5 text-center">
            <div className="w-full h-2 rounded-full bg-[#162238] overflow-hidden">
              <div className="w-0 h-full bg-[#386BFF]"></div>
            </div>
            <span className="text-xs text-[#94A3B8] pt-2">
              No sector exposure yet. Buy equity shares or index ETFs to dynamically track your asset allocation.
            </span>
          </div>
        )}
      </div>

      {/* Holdings Table with Filter & Search */}
      <div className="nexus-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#26354B]">
          <div>
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Holdings Breakdown ({filteredHoldings.length})
            </h3>
            <span className="text-xs text-[#94A3B8]">Long-Term Delivery Portfolios</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search holdings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
            >
              <option value="value">Sort: Value</option>
              <option value="pnl">Sort: Returns</option>
              <option value="ticker">Sort: Symbol</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
                <th className="py-2 px-3">Security</th>
                <th className="py-2 px-3 text-right">Shares</th>
                <th className="py-2 px-3 text-right">Avg. Price</th>
                <th className="py-2 px-3 text-right">LTP</th>
                <th className="py-2 px-3 text-right">Invested</th>
                <th className="py-2 px-3 text-right">Current Value</th>
                <th className="py-2 px-3 text-right">Day P&L</th>
                <th className="py-2 px-3 text-right">Total Returns</th>
                <th className="py-2 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
              {isPortfolioLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <CirclingLoader size="md" label="Loading portfolio holdings..." />
                  </td>
                </tr>
              ) : filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#94A3B8]">
                    No holdings in your portfolio yet. Buy stocks using the Order Entry Panel to build your positions.
                  </td>
                </tr>
              ) : (
                filteredHoldings.map((h) => {
                const isPnlUp = h.pnl >= 0;
                const isDayUp = (h.day_pnl || 0) >= 0;

                return (
                  <tr key={h.ticker} className="hover:bg-[#1A2940]/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#F1F5FC]">{h.ticker}</div>
                      <div className="text-[10px] text-[#94A3B8] font-sans truncate max-w-[140px]">
                        {h.companyName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#F1F5FC]">
                      {h.shares}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                      ₹{h.avg_price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#F1F5FC]">
                      ₹{h.current_price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                      ₹{h.invested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#F1F5FC]">
                      ₹{h.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={isDayUp ? "text-[#00C087]" : "text-[#F04452]"}>
                        {isDayUp ? "+" : ""}₹{h.day_pnl?.toFixed(2)} ({isDayUp ? "+" : ""}
                        {h.day_pnl_pct?.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={isPnlUp ? "text-[#00C087]" : "text-[#F04452]"}>
                        {isPnlUp ? "+" : ""}₹
                        {h.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (
                        {isPnlUp ? "+" : ""}
                        {h.pnl_pct.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5 font-sans">
                        <button
                          onClick={() => openOrderModal(h.ticker, "BUY")}
                          disabled={!isMarketOpen}
                          className={`px-2 py-1 rounded text-white text-[10px] font-semibold transition-colors ${
                            isMarketOpen
                              ? "bg-[#386BFF] hover:bg-[#4C7DFF] cursor-pointer"
                              : "bg-[#386BFF]/40 cursor-not-allowed opacity-60"
                          }`}
                          title={isMarketOpen ? "Buy more shares" : "Market closed (After Hours)"}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => openOrderModal(h.ticker, "SELL")}
                          disabled={!isMarketOpen}
                          className={`px-2 py-1 rounded text-white text-[10px] font-semibold transition-colors ${
                            isMarketOpen
                              ? "bg-[#F04452] hover:bg-[#ff5a68] cursor-pointer"
                              : "bg-[#F04452]/40 cursor-not-allowed opacity-60"
                          }`}
                          title={isMarketOpen ? "Sell/Exit position" : "Market closed (After Hours)"}
                        >
                          Exit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
