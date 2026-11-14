import React, { useState, useMemo } from "react";
import { FileText, ArrowUpRight, ArrowDownRight, Search, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tradingApi } from "../../services/api";
import { OrderItem, OrderStatus } from "../../types";

export const OrdersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"ALL" | OrderStatus>("ALL");
  const [search, setSearch] = useState("");

  const {
    data: transactions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["userTransactions"],
    queryFn: () => tradingApi.getTransactions(100),
    refetchInterval: 10000,
  });

  const orders: OrderItem[] = useMemo(() => {
    return transactions.map((t) => {
      let timeStr = "Recently";
      if (t.timestamp) {
        try {
          const d = new Date(t.timestamp);
          timeStr = d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }) + " " + d.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          timeStr = t.timestamp;
        }
      }

      return {
        id: `ORD-${t.id.toString().padStart(5, "0")}`,
        ticker: t.ticker,
        exchange: "NSE",
        side: (t.type?.toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
        product: "CNC",
        orderType: "MARKET",
        quantity: t.quantity,
        filledQuantity: t.quantity,
        price: t.price,
        status: "EXECUTED" as OrderStatus,
        timestamp: timeStr,
      };
    });
  }, [transactions]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesTab = activeTab === "ALL" || o.status === activeTab;
      const matchesSearch =
        o.ticker.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "EXECUTED":
        return "bg-[#00C087]/15 text-[#00C087] border-[#00C087]/30";
      case "OPEN":
        return "bg-[#386BFF]/15 text-[#386BFF] border-[#386BFF]/30";
      case "CANCELLED":
        return "bg-[#64748B]/15 text-[#94A3B8] border-[#64748B]/30";
      case "REJECTED":
        return "bg-[#F04452]/15 text-[#F04452] border-[#F04452]/30";
      default:
        return "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30";
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="nexus-card p-4">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#26354B]">
          <div className="flex items-center space-x-2">
            <FileText size={18} className="text-[#386BFF]" />
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Order Book & Trade Execution Logs ({filteredOrders.length})
            </h3>
            <button
              onClick={() => refetch()}
              className="p-1 rounded text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-colors"
              title="Refresh Orders"
            >
              <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs font-medium">
              {(["ALL", "EXECUTED", "OPEN", "CANCELLED"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === tab
                      ? "bg-[#386BFF] text-white"
                      : "text-[#94A3B8] hover:text-[#F1F5FC]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Security</th>
                <th className="py-2.5 px-3">Exchange</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-[#94A3B8]">
                    Loading execution logs from exchange...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isBuy = order.side === "BUY";

                  return (
                    <tr key={order.id} className="hover:bg-[#1A2940]/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#386BFF]">
                        {order.id}
                      </td>
                      <td className="py-2.5 px-3 text-[#94A3B8] font-sans">
                        {order.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#F1F5FC]">
                        {order.ticker}
                      </td>
                      <td className="py-2.5 px-3 text-[#94A3B8]">
                        {order.exchange}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-0.5 text-[11px] font-bold ${
                            isBuy ? "text-[#00C087]" : "text-[#F04452]"
                          }`}
                        >
                          {isBuy ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          <span>{order.side}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1A2940] text-[#F1F5FC]">
                          Delivery (CNC)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#94A3B8]">
                        {order.orderType}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#F1F5FC]">
                        {order.filledQuantity} / {order.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#F1F5FC]">
                        ₹{order.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-[#94A3B8]">
                    No trade executions recorded yet. Execute a trade using the Order Entry Panel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
