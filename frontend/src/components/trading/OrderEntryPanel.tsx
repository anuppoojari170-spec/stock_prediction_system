import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { OrderSide, OrderType, ProductType } from "../../types";

interface OrderEntryPanelProps {
  ticker: string;
}

export const OrderEntryPanel: React.FC<OrderEntryPanelProps> = ({ ticker }) => {
  const {
    exchange,
    mode,
    virtualBalance,
    submitOrder,
    liveTicks,
  } = useAppStore();

  const liveTick = liveTicks[ticker.toUpperCase()];

  const [side, setSide] = useState<OrderSide>("BUY");
  const [product, setProduct] = useState<ProductType>("CNC");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [qty, setQty] = useState<number>(10);
  const [customPrice, setCustomPrice] = useState<number>(liveTick?.price ?? 2984.50);
  const [triggerPrice, setTriggerPrice] = useState<number>(2950.00);

  // Modal and feedback state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(
    null
  );

  const effectivePrice = orderType === "MARKET" ? (liveTick?.price ?? 2984.50) : customPrice;
  const orderValue = qty * effectivePrice;

  // Indian statutory charges calculations
  const brokerage = product === "MIS" ? Math.min(20, orderValue * 0.0003) : 0;
  const stt = side === "BUY" && product === "CNC" ? orderValue * 0.001 : 0;
  const exchangeCharges = orderValue * 0.0000345;
  const gst = (brokerage + exchangeCharges) * 0.18;
  const stampDuty = side === "BUY" ? orderValue * 0.00015 : 0;
  const totalCharges = brokerage + stt + exchangeCharges + gst + stampDuty;
  const totalPayable = side === "BUY" ? orderValue + totalCharges : orderValue - totalCharges;

  const hasSufficientFunds = side === "SELL" || virtualBalance >= totalPayable;

  const handlePlaceOrderClick = () => {
    if (qty <= 0) {
      setStatusMessage({ text: "Quantity must be greater than zero.", isError: true });
      return;
    }
    if (!hasSufficientFunds) {
      setStatusMessage({ text: "Insufficient margin in account for this order.", isError: true });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteConfirmedOrder = () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    setTimeout(() => {
      const res = submitOrder({
        ticker,
        exchange,
        side,
        product,
        orderType,
        quantity: qty,
        price: effectivePrice,
        triggerPrice: orderType === "SL" || orderType === "SL-M" ? triggerPrice : undefined,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);

      if (res.success) {
        setStatusMessage({ text: res.message, isError: false });
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        setStatusMessage({ text: res.message, isError: true });
      }
    }, 400);
  };

  return (
    <div className="nexus-card flex flex-col p-4 select-none">
      {/* Stock Header & Live Quote */}
      <div className="flex items-center justify-between pb-3 border-b border-[#26354B]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-base text-[#F1F5FC]">{ticker}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1A2940] text-[#94A3B8]">
              {exchange}
            </span>
          </div>
          <span className="text-[11px] text-[#94A3B8]">Order Execution Terminal</span>
        </div>

        <div className="text-right font-mono-numbers">
          <div
            key={`${ticker}-${liveTick?.price}`}
            className={`text-sm font-bold text-[#F1F5FC] px-1 py-0.5 rounded transition-colors ${
              liveTick?.direction === "up" ? "flash-up text-[#00C087]" : liveTick?.direction === "down" ? "flash-down text-[#F04452]" : ""
            }`}
          >
            ₹{(liveTick?.price ?? 2984.50).toFixed(2)}
          </div>
          <div
            className={`text-[11px] font-semibold ${
              (liveTick?.change ?? 38.20) >= 0 ? "text-[#00C087]" : "text-[#F04452]"
            }`}
          >
            {(liveTick?.change ?? 38.20) >= 0 ? "+" : ""}
            {(liveTick?.change ?? 38.20).toFixed(2)} (
            {(liveTick?.change_pct ?? 1.30) >= 0 ? "+" : ""}
            {(liveTick?.change_pct ?? 1.30).toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Buy / Sell Tabs */}
      <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-[#0B1120] rounded-md border border-[#26354B]">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2 rounded font-semibold text-xs flex items-center justify-center space-x-1 transition-all ${
            side === "BUY"
              ? "bg-[#386BFF] text-white shadow-md shadow-[#386BFF]/25"
              : "text-[#94A3B8] hover:text-[#F1F5FC]"
          }`}
        >
          <ArrowUpRight size={14} />
          <span>BUY (Long)</span>
        </button>

        <button
          onClick={() => setSide("SELL")}
          className={`py-2 rounded font-semibold text-xs flex items-center justify-center space-x-1 transition-all ${
            side === "SELL"
              ? "bg-[#F04452] text-white shadow-md shadow-[#F04452]/25"
              : "text-[#94A3B8] hover:text-[#F1F5FC]"
          }`}
        >
          <ArrowDownRight size={14} />
          <span>SELL (Short)</span>
        </button>
      </div>

      {/* Product Type (Delivery CNC vs Intraday MIS) */}
      <div className="mt-3">
        <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
          Product Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setProduct("CNC")}
            className={`py-1.5 px-2 rounded text-xs font-medium border text-left flex flex-col transition-all ${
              product === "CNC"
                ? "bg-[#1A2940] border-[#386BFF] text-[#F1F5FC]"
                : "bg-[#0B1120] border-[#26354B] text-[#94A3B8] hover:border-[#386BFF]/50"
            }`}
          >
            <span className="font-semibold text-xs">Delivery (CNC)</span>
            <span className="text-[10px] text-[#94A3B8]">Hold long term • 1x</span>
          </button>

          <button
            onClick={() => setProduct("MIS")}
            className={`py-1.5 px-2 rounded text-xs font-medium border text-left flex flex-col transition-all ${
              product === "MIS"
                ? "bg-[#1A2940] border-[#386BFF] text-[#F1F5FC]"
                : "bg-[#0B1120] border-[#26354B] text-[#94A3B8] hover:border-[#386BFF]/50"
            }`}
          >
            <span className="font-semibold text-xs">Intraday (MIS)</span>
            <span className="text-[10px] text-[#94A3B8]">Auto-squareoff • 5x</span>
          </button>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="mt-3">
        <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
          Order Type
        </label>
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs">
          {(["MARKET", "LIMIT", "SL", "SL-M"] as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`py-1 rounded text-[11px] font-medium transition-all ${
                orderType === t
                  ? "bg-[#386BFF] text-white"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity & Quick Lots */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-[#94A3B8]">Quantity (Shares)</label>
          <div className="flex space-x-1">
            {[10, 25, 50, 100].map((lot) => (
              <button
                key={lot}
                onClick={() => setQty((prev) => prev + lot)}
                className="px-1.5 py-0.5 bg-[#1A2940] hover:bg-[#386BFF]/30 text-[10px] font-mono text-[#F1F5FC] rounded border border-[#26354B]"
              >
                +{lot}
              </button>
            ))}
          </div>
        </div>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-sm text-[#F1F5FC] font-mono focus:outline-none focus:border-[#386BFF]"
        />
      </div>

      {/* Limit Price Input */}
      {orderType !== "MARKET" && (
        <div className="mt-3">
          <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
            Limit Price (₹)
          </label>
          <input
            type="number"
            step="0.05"
            value={customPrice}
            onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-sm text-[#F1F5FC] font-mono focus:outline-none focus:border-[#386BFF]"
          />
        </div>
      )}

      {/* Trigger Price Input */}
      {(orderType === "SL" || orderType === "SL-M") && (
        <div className="mt-3">
          <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
            Trigger Price (₹)
          </label>
          <input
            type="number"
            step="0.05"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-sm text-[#F1F5FC] font-mono focus:outline-none focus:border-[#386BFF]"
          />
        </div>
      )}

      {/* Financial Valuation & Statutory Charges Breakdown */}
      <div className="mt-4 p-3 bg-[#0B1120] rounded border border-[#26354B] space-y-1.5 text-xs font-mono-numbers">
        <div className="flex justify-between text-[#94A3B8]">
          <span>Order Value:</span>
          <span className="text-[#F1F5FC]">₹{orderValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#94A3B8]">
          <span>Est. Statutory Charges:</span>
          <span>₹{totalCharges.toFixed(2)}</span>
        </div>
        <div className="pt-1.5 border-t border-[#26354B] flex justify-between font-semibold">
          <span className="text-[#F1F5FC]">Total Required:</span>
          <span className="text-[#386BFF]">₹{totalPayable.toFixed(2)}</span>
        </div>
      </div>

      {/* Beginner Mode Educational Notice */}
      {mode === "beginner" && (
        <div className="mt-3 p-2 bg-[#7657F6]/10 border border-[#7657F6]/30 rounded text-[11px] text-[#F1F5FC] flex items-start space-x-2">
          <HelpCircle size={14} className="text-[#7657F6] flex-shrink-0 mt-0.5" />
          <span>
            {side === "BUY"
              ? `You are placing a request to purchase ${qty} shares of ${ticker}. Your money is only deducted once the exchange executes the order.`
              : `You are placing a request to sell ${qty} shares of ${ticker}. Funds will be credited upon execution.`}
          </span>
        </div>
      )}

      {/* Insufficient balance notice */}
      {!hasSufficientFunds && (
        <div className="mt-2.5 p-2 bg-[#F04452]/10 border border-[#F04452]/30 rounded flex items-center space-x-2 text-xs text-[#F04452]">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>Insufficient margin (Available: ₹{virtualBalance.toFixed(2)})</span>
        </div>
      )}

      {/* Success / Error Status Banner */}
      {statusMessage && (
        <div
          className={`mt-2.5 p-2 rounded flex items-center space-x-2 text-xs ${
            statusMessage.isError
              ? "bg-[#F04452]/15 text-[#F04452] border border-[#F04452]/30"
              : "bg-[#00C087]/15 text-[#00C087] border border-[#00C087]/30"
          }`}
        >
          {statusMessage.isError ? (
            <AlertTriangle size={14} className="flex-shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        onClick={handlePlaceOrderClick}
        disabled={!hasSufficientFunds}
        className={`mt-4 w-full py-2.5 rounded font-semibold text-xs tracking-wider uppercase transition-all shadow-md ${
          side === "BUY"
            ? "bg-[#386BFF] hover:bg-[#4C7DFF] text-white shadow-[#386BFF]/25"
            : "bg-[#F04452] hover:bg-[#ff5a68] text-white shadow-[#F04452]/25"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {side} {ticker} ({qty} Shares)
      </button>

      {/* Order Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111C30] border border-[#26354B] rounded-lg max-w-sm w-full p-5 shadow-2xl">
            <h3 className="font-heading font-bold text-base text-[#F1F5FC] mb-1">
              Confirm {side} Order
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Please review the trade parameters before sending to the exchange.
            </p>

            <div className="space-y-2 py-3 border-y border-[#26354B] text-xs font-mono-numbers">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Security:</span>
                <span className="font-semibold text-[#F1F5FC]">{ticker} ({exchange})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Action:</span>
                <span className={`font-semibold ${side === "BUY" ? "text-[#00C087]" : "text-[#F04452]"}`}>
                  {side}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Product:</span>
                <span className="text-[#F1F5FC]">{product === "CNC" ? "Delivery (CNC)" : "Intraday (MIS)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Order Type:</span>
                <span className="text-[#F1F5FC]">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Quantity:</span>
                <span className="text-[#F1F5FC]">{qty} Shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Exec. Price:</span>
                <span className="text-[#F1F5FC]">₹{effectivePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-[#26354B]">
                <span className="text-[#F1F5FC]">Net Value:</span>
                <span className="text-[#386BFF]">₹{totalPayable.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-3 mt-5">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded text-xs font-medium bg-[#1A2940] hover:bg-[#26354B] text-[#94A3B8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedOrder}
                disabled={isSubmitting}
                className={`flex-1 py-2 rounded text-xs font-semibold text-white transition-all ${
                  side === "BUY" ? "bg-[#386BFF] hover:bg-[#4C7DFF]" : "bg-[#F04452] hover:bg-[#ff5a68]"
                } disabled:opacity-50`}
              >
                {isSubmitting ? "Routing..." : "Confirm & Place"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
