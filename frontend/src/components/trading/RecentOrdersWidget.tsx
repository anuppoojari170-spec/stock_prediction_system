import React from "react";
import { ArrowUpRight, ArrowDownRight, XCircle } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { OrderStatus } from "../../types";

export const RecentOrdersWidget: React.FC = () => {
  const { orders, cancelOrder, setActiveTab } = useAppStore();

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
    <div className="nexus-card p-4 select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#26354B]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F5FC]">
            Recent Orders & Trades
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">Real-Time Book</span>
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
              <th className="py-1.5 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
            {orders.slice(0, 5).map((order) => {
              const isBuy = order.side === "BUY";
              return (
                <tr key={order.id} className="hover:bg-[#1A2940]/40 transition-colors">
                  <td className="py-2 px-2 text-[11px] text-[#94A3B8] font-sans">
                    {order.timestamp}
                  </td>
                  <td className="py-2 px-2 font-bold text-[#F1F5FC]">
                    {order.ticker}
                    <span className="ml-1 text-[9px] font-normal text-[#94A3B8]">
                      {order.product}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`inline-flex items-center space-x-0.5 text-[11px] font-bold ${
                        isBuy ? "text-[#00C087]" : "text-[#F04452]"
                      }`}
                    >
                      {isBuy ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      <span>{order.side}</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-[#F1F5FC]">
                    {order.filledQuantity}/{order.quantity}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-[#F1F5FC]">
                    ₹{order.price.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {order.status === "OPEN" ? (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#F04452] hover:bg-[#F04452]/10 transition-colors"
                        title="Cancel Open Order"
                      >
                        <XCircle size={14} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#64748B]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
