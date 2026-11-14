import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tradingApi } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import { CirclingLoader } from "../common/CirclingLoader";

export const RecentOrdersWidget: React.FC = () => {
  const { setActiveTab } = useAppStore();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["userTransactions"],
    queryFn: () => tradingApi.getTransactions(5),
    refetchInterval: 10000,
  });

  return (
    <div className="nexus-card p-4 select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#26354B]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F5FC]">
            Recent Executions & Trades
          </span>
          <span className="text-[10px] text-[#00C087] font-mono">Live Book</span>
        </div>

        <button
          onClick={() => setActiveTab("orders")}
          className="text-[11px] font-medium text-[#386BFF] hover:underline"
        >
          View All Orders →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
              <th className="py-1.5 px-2">Time</th>
              <th className="py-1.5 px-2">Stock</th>
              <th className="py-1.5 px-2">Side</th>
              <th className="py-1.5 px-2 text-right">Qty</th>
              <th className="py-1.5 px-2 text-right">Price</th>
              <th className="py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center">
                  <CirclingLoader size="sm" label="Loading recent executions..." />
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.slice(0, 5).map((t) => {
                const isBuy = t.type?.toUpperCase() !== "SELL";
                let timeStr = "Recently";
                if (t.timestamp) {
                  try {
                    timeStr = new Date(t.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } catch {
                    timeStr = t.timestamp;
                  }
                }

                return (
                  <tr key={t.id} className="hover:bg-[#1A2940]/40 transition-colors">
                    <td className="py-2 px-2 text-[11px] text-[#94A3B8] font-sans">
                      {timeStr}
                    </td>
                    <td className="py-2 px-2 font-bold text-[#F1F5FC]">
                      {t.ticker}
                      <span className="ml-1 text-[9px] font-normal text-[#94A3B8]">
                        CNC
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center space-x-0.5 text-[11px] font-bold ${
                          isBuy ? "text-[#00C087]" : "text-[#F04452]"
                        }`}
                      >
                        {isBuy ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        <span>{isBuy ? "BUY" : "SELL"}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-[#F1F5FC] font-medium">
                      {t.quantity}
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-[#F1F5FC]">
                      ₹{t.price.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#00C087]/15 text-[#00C087] border border-[#00C087]/30">
                        EXECUTED
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[11px] text-[#94A3B8]">
                  No trade executions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
