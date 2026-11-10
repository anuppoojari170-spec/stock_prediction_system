import React, { useState } from "react";
import {
  CreditCard,
  Building,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export const FundsView: React.FC = () => {
  const {
    virtualBalance,
    usedMargin,
    depositFunds,
    withdrawFunds,
    resetVirtualFunds,
  } = useAppStore();

  const totalFunds = virtualBalance + usedMargin;
  const withdrawable = Math.max(0, virtualBalance - 10000);
  const utilizationPct = Math.round((usedMargin / (totalFunds || 1)) * 100);

  // Modal states
  const [modalMode, setModalMode] = useState<"DEPOSIT" | "WITHDRAW" | null>(null);
  const [amountInput, setAmountInput] = useState<string>("50000");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "NETBANKING">("UPI");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDeposit = () => {
    const val = parseFloat(amountInput);
    if (!val || val <= 0) return;
    depositFunds(val);
    setFeedback(`₹${val.toLocaleString("en-IN")} deposited instantly via ${paymentMethod}!`);
    setTimeout(() => {
      setFeedback(null);
      setModalMode(null);
    }, 1500);
  };

  const handleWithdraw = () => {
    const val = parseFloat(amountInput);
    if (!val || val <= 0) return;
    const ok = withdrawFunds(val);
    if (ok) {
      setFeedback(`₹${val.toLocaleString("en-IN")} withdrawal request queued to registered bank account.`);
      setTimeout(() => {
        setFeedback(null);
        setModalMode(null);
      }, 1500);
    } else {
      setFeedback("Withdrawal amount exceeds available withdrawable cash balance.");
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Available Cash Balance</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#386BFF] mt-1">
            ₹{virtualBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Unencumbered margin for trading</span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Used Margin</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#F5B942] mt-1">
            ₹{usedMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Committed to active positions</span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Total Account Valuation</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹{totalFunds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Cash + Margin + Collateral</span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Withdrawable Cash</span>
          <div className="text-2xl font-bold font-mono-numbers text-[#00C087] mt-1">
            ₹{withdrawable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">T+1 Settlement Cleared</span>
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
              onClick={() => {
                setModalMode("WITHDRAW");
                setAmountInput("25000");
                setFeedback(null);
              }}
              className="px-4 py-2 rounded-md bg-[#1A2940] hover:bg-[#26354B] text-[#F1F5FC] text-xs font-semibold border border-[#26354B] transition-colors"
            >
              Withdraw Funds
            </button>
            <button
              onClick={resetVirtualFunds}
              className="p-2 rounded-md bg-[#1A2940] hover:bg-[#26354B] text-[#94A3B8] hover:text-[#F1F5FC] transition-colors"
              title="Reset Virtual Funds to ₹5,00,000"
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

      {/* Add / Withdraw Funds Interactive Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111C30] border border-[#26354B] rounded-lg max-w-sm w-full p-5 shadow-2xl">
            <h3 className="font-heading font-bold text-base text-[#F1F5FC] mb-1">
              {modalMode === "DEPOSIT" ? "Add Funds via Instant Transfer" : "Withdraw Funds to Bank"}
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              {modalMode === "DEPOSIT"
                ? "Simulate instant UPI or NetBanking deposit into trading margin."
                : "Simulate funds withdrawal to your primary registered HDFC Bank account."}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded text-base font-bold font-mono text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
                />
              </div>

              {modalMode === "DEPOSIT" && (
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("UPI")}
                      className={`py-1.5 rounded text-xs font-semibold border ${
                        paymentMethod === "UPI"
                          ? "bg-[#386BFF]/20 border-[#386BFF] text-[#F1F5FC]"
                          : "bg-[#0B1120] border-[#26354B] text-[#94A3B8]"
                      }`}
                    >
                      Instant UPI (Zero Fee)
                    </button>
                    <button
                      onClick={() => setPaymentMethod("NETBANKING")}
                      className={`py-1.5 rounded text-xs font-semibold border ${
                        paymentMethod === "NETBANKING"
                          ? "bg-[#386BFF]/20 border-[#386BFF] text-[#F1F5FC]"
                          : "bg-[#0B1120] border-[#26354B] text-[#94A3B8]"
                      }`}
                    >
                      NetBanking
                    </button>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="p-2 rounded bg-[#386BFF]/15 border border-[#386BFF]/30 text-xs text-[#386BFF] flex items-center space-x-1.5">
                  <CheckCircle2 size={14} className="flex-shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-5">
              <button
                onClick={() => setModalMode(null)}
                className="flex-1 py-2 rounded text-xs font-medium bg-[#1A2940] text-[#94A3B8] hover:text-[#F1F5FC]"
              >
                Cancel
              </button>
              <button
                onClick={modalMode === "DEPOSIT" ? handleDeposit : handleWithdraw}
                className="flex-1 py-2 rounded text-xs font-semibold bg-[#386BFF] hover:bg-[#4C7DFF] text-white shadow-md shadow-[#386BFF]/20"
              >
                {modalMode === "DEPOSIT" ? "Add ₹" + amountInput : "Withdraw ₹" + amountInput}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
