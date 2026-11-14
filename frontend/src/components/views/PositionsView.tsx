import React, { useState, useMemo } from "react";
import { Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tradingApi } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import { Holding } from "../../types";

export const PositionsView: React.FC = () => {
  const { liveTicks, setActiveTicker, setOrderSide, setActiveTab } = useAppStore();
  const [filterTab, setFilterTab] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  const { data: holdings = [] } = useQuery<Holding[]>({
    queryKey: ["portfolioHoldingsList"],
    queryFn: tradingApi.getPortfolio,
    refetchInterval: 10000,
  });

  const positions = useMemo(() => {
    return holdings.map((h) => {
      const live = liveTicks[h.ticker.toUpperCase()];
      const ltp = live ? live.price : (h.current_price || h.avg_price);
      const unrealizedPnl = Math.round((ltp - h.avg_price) * h.shares * 100) / 100;
      return {
        id: `POS-${h.ticker}`,
        ticker: h.ticker,
        product: "CNC",
        quantity: h.shares,
        buyPrice: h.avg_price,
        ltp,
        realizedPnl: 0,
        unrealizedPnl,
        netPnl: unrealizedPnl,
        status: "OPEN" as "OPEN" | "CLOSED",
      };
    });
  }, [holdings, liveTicks]);

  const filteredPositions = positions.filter((p) => {
    if (filterTab === "OPEN") return p.status === "OPEN";
    if (filterTab === "CLOSED") return p.status === "CLOSED";
    return true;
  });

  const totalUnrealized = positions
    .filter((p) => p.status === "OPEN")
    .reduce((acc, p) => acc + p.unrealizedPnl, 0);

  const totalRealized = 0;
  const netPnl = totalUnrealized + totalRealized;
  const isNetPositive = netPnl >= 0;

  return (
    <div className="space-y-4 select-none">
      {/* 3 Summary P&L Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Total Net P&L (MTM)</span>
          <div
            className={`text-2xl font-bold font-mono-numbers mt-1 ${
              isNetPositive ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {isNetPositive ? "+" : ""}₹{netPnl.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Realized + Unrealized</span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Unrealized P&L</span>
          <div
            className={`text-2xl font-bold font-mono-numbers mt-1 ${
              totalUnrealized >= 0 ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {totalUnrealized >= 0 ? "+" : ""}₹{totalUnrealized.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Active Open Positions</span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Realized P&L</span>
          <div className="text-2xl font-bold font-mono-numbers mt-1 text-[#94A3B8]">
            ₹0.00
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Squared Off Today</span>
        </div>
      </div>

      {/* Positions Table */}
      <div className="nexus-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#26354B]">
          <div className="flex items-center space-x-2">
            <Layers size={18} className="text-[#386BFF]" />
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Trading Positions ({filteredPositions.length})
            </h3>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#00C087]/15 text-[#00C087] text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C087] animate-pulse"></span>
              <span>LIVE MTM</span>
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs font-medium">
            {(["ALL", "OPEN", "CLOSED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 rounded transition-colors ${
                  filterTab === tab
                    ? "bg-[#386BFF] text-white"
                    : "text-[#94A3B8] hover:text-[#F1F5FC]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3 text-right">Avg. Buy</th>
                <th className="py-2 px-3 text-right">LTP</th>
                <th className="py-2 px-3 text-right">Unrealized P&L</th>
                <th className="py-2 px-3 text-right">Net P&L</th>
                <th className="py-2 px-3 text-center">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#94A3B8]">
                    No open positions currently active.
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  const isNetUp = pos.unrealizedPnl >= 0;

                  return (
                    <tr key={pos.id} className="hover:bg-[#1A2940]/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1A2940] text-[#386BFF]">
                          {pos.product}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#F1F5FC]">{pos.ticker}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#F1F5FC]">
                        {pos.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                        ₹{pos.buyPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#F1F5FC]">
                        ₹{pos.ltp.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={isNetUp ? "text-[#00C087]" : "text-[#F04452]"}>
                          {isNetUp ? "+" : ""}₹{pos.unrealizedPnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={isNetUp ? "text-[#00C087]" : "text-[#F04452]"}>
                          {isNetUp ? "+" : ""}₹{pos.netPnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setActiveTicker(pos.ticker);
                            setOrderSide("SELL");
                            setActiveTab("overview");
                          }}
                          className="px-2.5 py-1 rounded bg-[#F04452]/20 hover:bg-[#F04452] text-[#F04452] hover:text-white text-[10px] font-semibold border border-[#F04452]/40 transition-colors"
                        >
                          Exit Position
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
