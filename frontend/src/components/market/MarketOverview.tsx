import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowDownRight,
  Flame,
} from "lucide-react";
import { marketApi } from "../../services/api";
import { IndexItem, MoversResponse } from "../../types";
import { useAppStore } from "../../store/useAppStore";

export const MarketOverview: React.FC = () => {
  const { setActiveTicker, activeTicker } = useAppStore();
  const [moverTab, setMoverTab] = useState<"gainers" | "losers">("gainers");

  // Fetch major Indian indices
  const { data: indices } = useQuery<IndexItem[]>({
    queryKey: ["marketOverviewIndices"],
    queryFn: marketApi.getOverview,
    refetchInterval: 15000,
  });

  // Fetch top movers
  const { data: movers } = useQuery<MoversResponse>({
    queryKey: ["topMovers"],
    queryFn: marketApi.getMovers,
    refetchInterval: 15000,
  });

  // Fallback indices if offline
  const displayIndices: IndexItem[] = indices && indices.length > 0 ? indices : [
    { name: "NIFTY 50", value: 24345.80, change_pct: 0.60, change_abs: 145.20, direction: "up" },
    { name: "SENSEX", value: 79890.15, change_pct: 0.53, change_abs: 420.50, direction: "up" },
    { name: "BANK NIFTY", value: 51780.40, change_pct: -0.21, change_abs: -110.25, direction: "down" },
  ];

  // Fallback movers if offline
  const displayGainers = movers?.gainers && movers.gainers.length > 0 ? movers.gainers : [
    { ticker: "RELIANCE", price: 1330.00, change_pct: 1.15, company: "Reliance Industries", change_abs: 15.20, volume: "6.8M" },
    { ticker: "TATAMOTORS", price: 790.00, change_pct: 1.35, company: "Tata Motors Limited", change_abs: 10.60, volume: "7.8M" },
    { ticker: "INFY", price: 1550.00, change_pct: 1.24, company: "Infosys Limited", change_abs: 18.80, volume: "5.4M" },
    { ticker: "ICICIBANK", price: 1270.00, change_pct: 1.16, company: "ICICI Bank Limited", change_abs: 14.50, volume: "8.9M" },
    { ticker: "TCS", price: 3700.00, change_pct: 0.95, company: "Tata Consultancy Services", change_abs: 35.30, volume: "2.1M" },
  ];

  const displayLosers = movers?.losers && movers.losers.length > 0 ? movers.losers : [
    { ticker: "AXISBANK", price: 1180.00, change_pct: -0.65, company: "Axis Bank Limited", change_abs: -7.80, volume: "4.5M" },
    { ticker: "SBIN", price: 820.00, change_pct: -0.50, company: "State Bank of India", change_abs: -4.10, volume: "9.2M" },
    { ticker: "HDFCBANK", price: 1750.00, change_pct: -0.42, company: "HDFC Bank Limited", change_abs: -7.40, volume: "12.4M" },
    { ticker: "WIPRO", price: 560.00, change_pct: -0.37, company: "Wipro Limited", change_abs: -2.10, volume: "4.1M" },
    { ticker: "COALINDIA", price: 432.10, change_pct: -0.28, company: "Coal India Limited", change_abs: -1.20, volume: "3.2M" },
  ];

  const activeMoverList = moverTab === "gainers" ? displayGainers : displayLosers;

  return (
    <div className="nexus-card p-4 select-none space-y-4">
      {/* Top Section: Live Major Indices Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {displayIndices.slice(0, 3).map((idx) => {
          const isUp = (idx.change_pct ?? 0) >= 0;

          return (
            <div
              key={idx.name}
              className="p-3 rounded-md bg-[#0B1120] border border-[#26354B] flex items-center justify-between font-mono-numbers"
            >
              <div>
                <span className="text-[11px] font-sans font-semibold text-[#94A3B8] block">
                  {idx.name}
                </span>
                <span className="text-base font-bold text-[#F1F5FC] mt-0.5 block">
                  {idx.value
                    ? idx.value.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </span>
              </div>

              <div
                className={`text-right text-xs font-bold flex flex-col items-end ${
                  isUp ? "text-[#00C087]" : "text-[#F04452]"
                }`}
              >
                <span className="flex items-center space-x-0.5">
                  {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>
                    {isUp ? "+" : ""}
                    {(idx.change_pct ?? 0).toFixed(2)}%
                  </span>
                </span>
                {idx.change_abs !== undefined && (
                  <span className="text-[10px] opacity-80">
                    {isUp ? "+" : ""}
                    {idx.change_abs.toFixed(2)} pts
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Top Movers (Gainers & Losers) */}
      <div className="pt-3 border-t border-[#26354B]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#26354B]/50">
          <div className="flex items-center space-x-2">
            <Flame size={16} className="text-[#386BFF]" />
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#F1F5FC]">
              Market Movers & Momentum
            </span>
          </div>

          <div className="flex items-center space-x-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs font-medium">
            <button
              onClick={() => setMoverTab("gainers")}
              className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                moverTab === "gainers"
                  ? "bg-[#00C087] text-white"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              Gainers
            </button>
            <button
              onClick={() => setMoverTab("losers")}
              className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                moverTab === "losers"
                  ? "bg-[#F04452] text-white"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              Losers
            </button>
          </div>
        </div>

        {/* Movers Horizontal Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono-numbers">
          {activeMoverList.slice(0, 5).map((m) => {
            const isUp = m.change_pct >= 0;
            const isSelected = activeTicker === m.ticker;

            return (
              <div
                key={m.ticker}
                onClick={() => setActiveTicker(m.ticker)}
                className={`p-2 rounded cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-[#1A2940] border-[#386BFF]"
                    : "bg-[#0B1120] border-[#26354B]/60 hover:border-[#386BFF]/50"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#F1F5FC]">
                  <span>{m.ticker}</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isUp ? "text-[#00C087]" : "text-[#F04452]"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {m.change_pct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  ₹{m.price.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
