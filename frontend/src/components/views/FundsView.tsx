import React, { useState } from "react";
import {
  CreditCard,
  Building,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tradingApi, authApi } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";

export const FundsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  const {
    data: summary,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["portfolioSummary"],
    queryFn: () => tradingApi.getSummary(),
    refetchInterval: 10000,
  });

  const virtualBalance = summary?.balance ?? user?.balance ?? 1000000;
  const usedMargin = summary?.total_invested ?? 0;
  const totalFunds = virtualBalance + (summary?.current_value ?? 0);
  const withdrawable = Math.max(0, virtualBalance - 10000);
  const utilizationPct = Math.min(
    100,
    Math.round((usedMargin / (totalFunds || 1)) * 100)
  );

  // Modal states
  const [modalMode, setModalMode] = useState<"DEPOSIT" | "WITHDRAW" | null>(null);
  const [amountInput, setAmountInput] = useState<string>("50000");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "NETBANKING">("UPI");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleDeposit = async () => {
    const val = parseFloat(amountInput);
    if (!val || val <= 0) return;
    setActionLoading(true);

    try {
      await tradingApi.depositFunds(val);
      setFeedback(`₹${val.toLocaleString("en-IN")} credited instantly via ${paymentMethod}!`);
      // Refresh user and portfolio summary
      await queryClient.invalidateQueries({ queryKey: ["portfolioSummary"] });
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);

      setTimeout(() => {
        setFeedback(null);
        setModalMode(null);
      }, 1500);
    } catch {
      setFeedback("Failed to process fund deposit. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFunds = async () => {
    if (!confirm("Reset virtual trading margin to ₹10,00,000?")) return;
    setActionLoading(true);
    try {
      await tradingApi.resetFunds();
      await queryClient.invalidateQueries({ queryKey: ["portfolioSummary"] });
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      setFeedback("Virtual balance reset to ₹10,00,000.00!");
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback("Failed to reset funds.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nexus-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Available Cash Balance</span>
            <button
              onClick={() => refetch()}
              className="text-[#94A3B8] hover:text-[#386BFF]"
              title="Refresh Balance"
            >
              <RefreshCw size={12} className={isRefetching ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-[#386BFF] mt-1">
            ₹{virtualBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">
            Unencumbered margin for trading
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Used Margin</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#F5B942] mt-1">
            ₹{usedMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">
            Committed to active positions
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Total Account Valuation</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹{totalFunds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">
            Cash + Portfolio Market Valuation
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Withdrawable Cash</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#00C087] mt-1">
            ₹{withdrawable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">
            T+1 Settlement Cleared
          </span>
        </div>
      </div>

      {/* Margin Utilization & Action Buttons */}
      <div className="nexus-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26354B]">
          <div>
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Margin Utilization & Leverage Health
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              SEBI Peak Margin compliant. Intraday equity leverage up to 5x.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setModalMode("DEPOSIT");
                setAmountInput("50000");
                setFeedback(null);
              }}
              className="px-4 py-2 rounded-md bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-xs font-semibold shadow-md shadow-[#386BFF]/25 transition-all"
            >
              + Add Funds
            </button>
            <button
              onClick={handleResetFunds}
              disabled={actionLoading}
              className="p-2 rounded-md bg-[#1A2940] hover:bg-[#26354B] text-[#94A3B8] hover:text-[#F1F5FC] transition-colors"
              title="Reset Virtual Funds to ₹10,00,000"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-mono-numbers mb-1.5">
            <span className="text-[#94A3B8]">Margin Used: {utilizationPct}%</span>
            <span className="text-[#386BFF]">Headroom Available: {100 - utilizationPct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#1A2940] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                utilizationPct > 80 ? "bg-[#F04452]" : "bg-[#386BFF]"
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fund History / Bank Details */}
      <div className="nexus-card p-4">
        <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-3">
          Primary Bank & Mandate Linking
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-numbers">
          <div className="p-3 rounded bg-[#0B1120] border border-[#26354B]/50 flex items-center space-x-3">
            <Building size={20} className="text-[#386BFF] flex-shrink-0" />
            <div>
              <span className="text-[#F1F5FC] font-bold block">HDFC Bank Ltd</span>
              <span className="text-[#94A3B8] text-[11px] block">A/C: *******9042 • IFSC: HDFC0000240</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B1120] border border-[#26354B]/50 flex items-center space-x-3">
            <CreditCard size={20} className="text-[#7657F6] flex-shrink-0" />
            <div>
              <span className="text-[#F1F5FC] font-bold block">Instant UPI Autopay</span>
              <span className="text-[#94A3B8] text-[11px] block">Verified • Limit ₹2,00,000/day</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B1120] border border-[#26354B]/50 flex items-center space-x-3">
            <CheckCircle2 size={20} className="text-[#00C087] flex-shrink-0" />
            <div>
              <span className="text-[#F1F5FC] font-bold block">Depository / Demat</span>
              <span className="text-[#94A3B8] text-[11px] block">CDSL DP ID: 12081600 • Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Funds Modal */}
      {modalMode === "DEPOSIT" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-[#26354B] bg-[#111C30] p-6 shadow-2xl">
            <h4 className="font-heading font-bold text-base text-[#F1F5FC] mb-1">
              Add Virtual Trading Margin
            </h4>
            <p className="text-xs text-[#94A3B8] mb-4">
              Instantly replenish your paper trading balance.
            </p>

            {feedback ? (
              <div className="p-3 rounded-md bg-[#00C087]/15 border border-[#00C087]/30 text-xs text-[#00C087] mb-4">
                {feedback}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded text-sm text-[#F1F5FC] font-mono-numbers focus:outline-none focus:border-[#386BFF]"
                  />
                  <div className="flex gap-2 mt-2">
                    {["25000", "50000", "100000", "500000"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmountInput(preset)}
                        className="px-2 py-1 bg-[#1A2940] hover:bg-[#26354B] text-[10px] text-[#F1F5FC] font-mono rounded"
                      >
                        +₹{Number(preset).toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("UPI")}
                      className={`p-2 rounded text-xs border font-medium transition-colors ${
                        paymentMethod === "UPI"
                          ? "bg-[#386BFF]/15 border-[#386BFF] text-white"
                          : "border-[#26354B] text-[#94A3B8]"
                      }`}
                    >
                      Instant UPI
                    </button>
                    <button
                      onClick={() => setPaymentMethod("NETBANKING")}
                      className={`p-2 rounded text-xs border font-medium transition-colors ${
                        paymentMethod === "NETBANKING"
                          ? "bg-[#386BFF]/15 border-[#386BFF] text-white"
                          : "border-[#26354B] text-[#94A3B8]"
                      }`}
                    >
                      Net Banking
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => setModalMode(null)}
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded bg-[#1A2940] hover:bg-[#26354B] text-xs text-[#94A3B8]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-xs font-semibold text-white shadow-md shadow-[#386BFF]/30 disabled:opacity-50"
                  >
                    {actionLoading ? "Crediting..." : "Confirm Deposit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
