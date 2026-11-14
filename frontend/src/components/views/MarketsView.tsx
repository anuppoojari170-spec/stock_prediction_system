import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { TradingChart } from "../chart/TradingChart";
import { OrderEntryPanel } from "../trading/OrderEntryPanel";
import { MarketDepth } from "../trading/MarketDepth";
import { SentimentGauge } from "../market/SentimentGauge";
import { StockDetails } from "../../types";
import { marketApi } from "../../services/api";

export const MarketsView: React.FC = () => {
  const { activeTicker, exchange, liveTicks } = useAppStore();

  const liveTick = liveTicks[activeTicker.toUpperCase()];

  const { data: serverDetails } = useQuery<StockDetails>({
    queryKey: ["stockDetails", activeTicker],
    queryFn: () => marketApi.getStockDetails(activeTicker),
    staleTime: 30000,
  });

  const details: StockDetails = useMemo(() => {
    const basePrice = liveTick?.price || serverDetails?.price || 1330.00;
    const basePrev = liveTick?.price ? liveTick.price - liveTick.change : (serverDetails?.prevClose || basePrice * 0.99);
    const chg = liveTick ? liveTick.change : (serverDetails ? serverDetails.changeAbs : basePrice - basePrev);
    const pct = liveTick ? liveTick.change_pct : (serverDetails ? serverDetails.changePct : (chg / basePrev) * 100);

    return {
      ticker: activeTicker,
      companyName: serverDetails?.companyName || `${activeTicker} Limited`,
      sector: serverDetails?.sector || "Indian Equities (NSE)",
      exchange,
      price: liveTick?.price || serverDetails?.price || basePrice,
      changeAbs: chg,
      changePct: pct,
      open: liveTick?.open || serverDetails?.open || basePrev,
      high: liveTick ? Math.max(liveTick.high, serverDetails?.high || liveTick.high) : (serverDetails?.high || basePrice * 1.01),
      low: liveTick ? Math.min(liveTick.low, serverDetails?.low || liveTick.low) : (serverDetails?.low || basePrice * 0.99),
      prevClose: basePrev,
      volume: liveTick?.volume || serverDetails?.volume || 3500000,
      avgVolume: serverDetails?.avgVolume || 3100000,
      marketCap: serverDetails?.marketCap || "₹1,25,000 Cr",
      peRatio: serverDetails?.peRatio || 22.5,
      pbRatio: serverDetails?.pbRatio || 3.2,
      divYield: serverDetails?.divYield || 1.10,
      high52: serverDetails?.high52 || basePrice * 1.25,
      low52: serverDetails?.low52 || basePrice * 0.75,
      description: serverDetails?.description || `Live institutional market profile for ${activeTicker} on National Stock Exchange of India (NSE).`,
    };
  }, [activeTicker, exchange, liveTick, serverDetails]);


  const isUp = details.changeAbs >= 0;

  // Day range percentage
  const dayRangePct = Math.min(
    100,
    Math.max(0, ((details.price - details.low) / (details.high - details.low || 1)) * 100)
  );

  // 52 Week range percentage
  const high52RangePct = Math.min(
    100,
    Math.max(0, ((details.price - details.low52) / (details.high52 - details.low52 || 1)) * 100)
  );

  return (
    <div className="space-y-4 select-none">
      {/* Detailed Stock Header Banner */}
      <div className="nexus-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-heading font-extrabold text-2xl text-[#F1F5FC]">
                {details.ticker}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#386BFF]/20 text-[#386BFF]">
                {details.exchange}
              </span>
              <span className="text-xs text-[#94A3B8] font-medium hidden sm:inline">
                {details.sector}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">{details.companyName}</p>
          </div>

          {/* Current LTP & Change */}
          <div className="text-left md:text-right font-mono-numbers">
            <div className="text-2xl md:text-3xl font-bold text-[#F1F5FC]">
              ₹
              {details.price.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`text-sm font-semibold flex items-center md:justify-end space-x-1 ${
                isUp ? "text-[#00C087]" : "text-[#F04452]"
              }`}
            >
              {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>
                {isUp ? "+" : ""}
                {details.changeAbs.toFixed(2)} ({isUp ? "+" : ""}
                {details.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Range Bars: Day Range & 52-Week Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 pt-4 border-t border-[#26354B] text-xs font-mono-numbers">
          {/* Day High / Low Bar */}
          <div>
            <div className="flex justify-between text-[#94A3B8] mb-1">
              <span>Day Low: ₹{details.low.toFixed(2)}</span>
              <span className="font-semibold text-[#F1F5FC]">Day's Range</span>
              <span>Day High: ₹{details.high.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1A2940] relative">
              <div
                className="absolute top-0 bottom-0 left-0 bg-[#386BFF] rounded-full"
                style={{ width: `${dayRangePct}%` }}
              ></div>
              <div
                className="absolute top-1/2 -mt-2 -ml-1 w-2.5 h-4 bg-white rounded-sm shadow-md"
                style={{ left: `${dayRangePct}%` }}
              ></div>
            </div>
          </div>

          {/* 52-Week High / Low Bar */}
          <div>
            <div className="flex justify-between text-[#94A3B8] mb-1">
              <span>52W Low: ₹{details.low52.toFixed(2)}</span>
              <span className="font-semibold text-[#F1F5FC]">52-Week Range</span>
              <span>52W High: ₹{details.high52.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1A2940] relative">
              <div
                className="absolute top-0 bottom-0 left-0 bg-[#7657F6] rounded-full"
                style={{ width: `${high52RangePct}%` }}
              ></div>
              <div
                className="absolute top-1/2 -mt-2 -ml-1 w-2.5 h-4 bg-white rounded-sm shadow-md"
                style={{ left: `${high52RangePct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Terminal Layout: Chart + Order Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Interactive Chart + Depth + Fundamentals */}
        <div className="lg:col-span-8 space-y-4">
          <TradingChart ticker={activeTicker} />

          {/* Key Fundamentals Table */}
          <div className="nexus-card p-4">
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-3">
              Key Fundamentals & Financial Valuation
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono-numbers">
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">Market Cap</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  {details.marketCap}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">P/E Ratio</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  {details.peRatio}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">P/B Ratio</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  {details.pbRatio}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">Dividend Yield</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  {details.divYield}%
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">Open Price</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  ₹{details.open.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">Prev. Close</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  ₹{details.prevClose.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">Volume</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  {(details.volume / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B]/50">
                <span className="text-[10px] text-[#94A3B8] block">Avg. Volume (30D)</span>
                <span className="font-bold text-[#F1F5FC] text-sm mt-0.5 block">
                  {(details.avgVolume / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>
          </div>

          {/* Company Narrative & Business Profile */}
          <div className="nexus-card p-4">
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-2">
              Company Overview & Business Profile
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {details.description}
            </p>
          </div>

          {/* 5-Level Market Depth (L2) Order Book */}
          <MarketDepth ticker={activeTicker} />
        </div>

        {/* Right Column: AI Sentiment Engine + Order Placement Panel */}
        <div className="lg:col-span-4 space-y-4">
          <SentimentGauge ticker={activeTicker} />
          <OrderEntryPanel ticker={activeTicker} />
        </div>
      </div>
    </div>
  );
};
