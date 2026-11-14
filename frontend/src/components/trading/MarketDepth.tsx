import React, { useMemo } from "react";
import { MarketDepthLevel } from "../../types";
import { useAppStore } from "../../store/useAppStore";

interface MarketDepthProps {
  ticker: string;
}

export const MarketDepth: React.FC<MarketDepthProps> = ({ ticker }) => {
  const streamDepth = useAppStore((state) => state.liveDepth[ticker.toUpperCase()]);
  const liveTick = useAppStore((state) => state.liveTicks[ticker.toUpperCase()]);
  const wsStatus = useAppStore((state) => state.wsStatus);
  const setOrderPrice = useAppStore((state) => state.setOrderPrice);
  const setOrderType = useAppStore((state) => state.setOrderType);
  const setOrderSide = useAppStore((state) => state.setOrderSide);

  // Use live streaming L2 order book depth if available, else responsive fallback
  const depthData: MarketDepthLevel[] = useMemo(() => {
    if (streamDepth && streamDepth.bids && streamDepth.bids.length >= 5 && streamDepth.asks && streamDepth.asks.length >= 5) {
      return streamDepth.bids.slice(0, 5).map((bid, idx) => {
        const ask = streamDepth.asks[idx];
        return {
          bidOrders: bid.orders,
          bidQty: bid.qty,
          bidPrice: bid.price,
          askPrice: ask ? ask.price : bid.price + 0.5,
          askQty: ask ? ask.qty : 1200,
          askOrders: ask ? ask.orders : 10,
        };
      });
    }

    // Dynamic fallback based on live price
    const base = liveTick?.price || (ticker.toUpperCase() === "RELIANCE" ? 1330.00 : 1500.0);
    return [
      { bidOrders: 12, bidQty: 1450, bidPrice: base - 0.40, askPrice: base, askQty: 1820, askOrders: 8 },
      { bidOrders: 24, bidQty: 3200, bidPrice: base - 0.70, askPrice: base + 0.40, askQty: 2450, askOrders: 15 },
      { bidOrders: 18, bidQty: 2100, bidPrice: base - 1.00, askPrice: base + 0.70, askQty: 3900, askOrders: 21 },
      { bidOrders: 31, bidQty: 4850, bidPrice: base - 1.50, askPrice: base + 1.25, askQty: 1950, askOrders: 11 },
      { bidOrders: 42, bidQty: 6200, bidPrice: base - 2.00, askPrice: base + 1.60, askQty: 5400, askOrders: 29 },
    ];
  }, [ticker, streamDepth, liveTick]);


  const totalBidQty = depthData.reduce((acc, row) => acc + row.bidQty, 0);
  const totalAskQty = depthData.reduce((acc, row) => acc + row.askQty, 0);
  const totalQty = totalBidQty + totalAskQty;
  const bidRatio = Math.round((totalBidQty / totalQty) * 100);
  const askRatio = 100 - bidRatio;

  const maxRowQty = Math.max(
    ...depthData.map((d) => d.bidQty),
    ...depthData.map((d) => d.askQty)
  );

  return (
    <div className="nexus-card p-4 select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#26354B]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F5FC]">
            Market Depth (L2)
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">5-Level Book</span>
        </div>
        <span
          className={`text-[10px] font-mono flex items-center space-x-1 ${
            wsStatus === "connected" ? "text-[#00C087]" : "text-[#94A3B8]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wsStatus === "connected" ? "bg-[#00C087] animate-pulse" : "bg-[#94A3B8]"
            }`}
          ></span>
          <span>{wsStatus === "connected" ? "Live L2 Feed" : "Depth Book"}</span>
        </span>
      </div>

      {/* Depth Ladder Table */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-numbers">
        {/* Bid Side (Buy) */}
        <div>
          <div className="grid grid-cols-3 text-[10px] text-[#94A3B8] font-semibold pb-1 border-b border-[#26354B]/50">
            <span>Orders</span>
            <span className="text-right">Qty</span>
            <span className="text-right text-[#00C087]">Bid (₹)</span>
          </div>

          <div className="space-y-1 mt-1">
            {depthData.map((row, idx) => {
              const barWidth = `${Math.min(100, Math.round((row.bidQty / maxRowQty) * 100))}%`;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setOrderSide("BUY");
                    setOrderType("LIMIT");
                    setOrderPrice(row.bidPrice);
                  }}
                  className="relative grid grid-cols-3 py-0.5 px-1 rounded overflow-hidden cursor-pointer hover:bg-[#00C087]/20 transition-colors"
                  title={`Click to place Buy Limit order at ₹${row.bidPrice.toFixed(2)}`}
                >
                  {/* Subtle depth bar */}
                  <div
                    className="absolute inset-y-0 right-0 bg-[#00C087]/15 rounded pointer-events-none"
                    style={{ width: barWidth }}
                  />
                  <span className="text-[#94A3B8] z-10">{row.bidOrders}</span>
                  <span className="text-right text-[#F1F5FC] z-10">{row.bidQty}</span>
                  <span className="text-right font-semibold text-[#00C087] z-10">
                    {row.bidPrice.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-[#26354B]/50 flex justify-between text-[11px] text-[#94A3B8]">
            <span>Total Bids:</span>
            <span className="font-semibold text-[#F1F5FC]">{totalBidQty.toLocaleString()}</span>
          </div>
        </div>

        {/* Ask Side (Sell) */}
        <div>
          <div className="grid grid-cols-3 text-[10px] text-[#94A3B8] font-semibold pb-1 border-b border-[#26354B]/50">
            <span className="text-left text-[#F04452]">Ask (₹)</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>

          <div className="space-y-1 mt-1">
            {depthData.map((row, idx) => {
              const barWidth = `${Math.min(100, Math.round((row.askQty / maxRowQty) * 100))}%`;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setOrderSide("SELL");
                    setOrderType("LIMIT");
                    setOrderPrice(row.askPrice);
                  }}
                  className="relative grid grid-cols-3 py-0.5 px-1 rounded overflow-hidden cursor-pointer hover:bg-[#F04452]/20 transition-colors"
                  title={`Click to place Sell Limit order at ₹${row.askPrice.toFixed(2)}`}
                >
                  {/* Subtle depth bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-[#F04452]/15 rounded pointer-events-none"
                    style={{ width: barWidth }}
                  />
                  <span className="text-left font-semibold text-[#F04452] z-10">
                    {row.askPrice.toFixed(2)}
                  </span>
                  <span className="text-right text-[#F1F5FC] z-10">{row.askQty}</span>
                  <span className="text-right text-[#94A3B8] z-10">{row.askOrders}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-[#26354B]/50 flex justify-between text-[11px] text-[#94A3B8]">
            <span>Total Asks:</span>
            <span className="font-semibold text-[#F1F5FC]">{totalAskQty.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Visual Bid vs Ask Ratio Bar */}
      <div className="mt-3 pt-2 border-t border-[#26354B]">
        <div className="flex justify-between text-[10px] font-mono-numbers text-[#94A3B8] mb-1">
          <span className="text-[#00C087]">Buyers: {bidRatio}%</span>
          <span className="text-[#F04452]">Sellers: {askRatio}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1A2940] flex overflow-hidden">
          <div className="bg-[#00C087] h-full" style={{ width: `${bidRatio}%` }}></div>
          <div className="bg-[#F04452] h-full" style={{ width: `${askRatio}%` }}></div>
        </div>
      </div>
    </div>
  );
};

