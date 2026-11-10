import React, { useMemo } from "react";
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

const stockDatabase: Record<string, StockDetails> = {
  RELIANCE: {
    ticker: "RELIANCE",
    companyName: "Reliance Industries Limited",
    sector: "Oil, Gas & Energy / Telecommunications / Retail",
    exchange: "NSE",
    price: 2984.50,
    changeAbs: 38.20,
    changePct: 1.30,
    open: 2950.00,
    high: 2992.40,
    low: 2942.10,
    prevClose: 2946.30,
    volume: 6842100,
    avgVolume: 5920000,
    marketCap: "₹20,18,500 Cr",
    peRatio: 28.4,
    pbRatio: 2.35,
    divYield: 0.35,
    high52: 3217.90,
    low52: 2220.30,
    description:
      "Reliance Industries is a Fortune 500 company and the largest private sector corporation in India. Its business footprint spans hydrocarbon exploration and production, petroleum refining and marketing, petrochemicals, retail, and digital services (Jio).",
  },
  TCS: {
    ticker: "TCS",
    companyName: "Tata Consultancy Services Limited",
    sector: "Information Technology & Software Services",
    exchange: "NSE",
    price: 4120.75,
    changeAbs: 45.30,
    changePct: 1.11,
    open: 4085.00,
    high: 4135.00,
    low: 4070.00,
    prevClose: 4075.45,
    volume: 2145800,
    avgVolume: 1950000,
    marketCap: "₹14,92,400 Cr",
    peRatio: 31.2,
    pbRatio: 14.8,
    divYield: 1.25,
    high52: 4585.00,
    low52: 3313.00,
    description:
      "Tata Consultancy Services is an Indian multinational information technology services and consulting company headquartered in Mumbai. It is a part of the Tata Group and operates in 150 locations across 46 countries.",
  },
  HDFCBANK: {
    ticker: "HDFCBANK",
    companyName: "HDFC Bank Limited",
    sector: "Banking & Financial Services",
    exchange: "NSE",
    price: 1742.30,
    changeAbs: -8.40,
    changePct: -0.48,
    open: 1755.00,
    high: 1758.50,
    low: 1738.00,
    prevClose: 1750.70,
    volume: 12450000,
    avgVolume: 14200000,
    marketCap: "₹13,25,800 Cr",
    peRatio: 19.8,
    pbRatio: 2.85,
    divYield: 1.12,
    high52: 1794.00,
    low52: 1363.55,
    description:
      "HDFC Bank Limited is the largest private sector bank in India by assets and world's tenth largest bank by market capitalization. It offers a comprehensive suite of banking products and services.",
  },
  INFY: {
    ticker: "INFY",
    companyName: "Infosys Limited",
    sector: "Information Technology & Digital Services",
    exchange: "NSE",
    price: 1865.10,
    changeAbs: 22.80,
    changePct: 1.24,
    open: 1845.00,
    high: 1872.00,
    low: 1840.50,
    prevClose: 1842.30,
    volume: 5410000,
    avgVolume: 6100000,
    marketCap: "₹7,74,500 Cr",
    peRatio: 29.5,
    pbRatio: 8.9,
    divYield: 2.15,
    high52: 1991.45,
    low52: 1358.35,
    description:
      "Infosys is a global leader in next-generation digital services and consulting, enabling clients across 56 countries to navigate their digital transformation powered by Cloud and AI.",
  },
};

export const MarketsView: React.FC = () => {
  const { activeTicker, exchange } = useAppStore();

  const details = useMemo(() => {
    return (
      stockDatabase[activeTicker] || {
        ticker: activeTicker,
        companyName: `${activeTicker} Limited`,
        sector: "Diversified Equities",
        exchange,
        price: 1540.00,
        changeAbs: 18.50,
        changePct: 1.22,
        open: 1525.00,
        high: 1548.00,
        low: 1520.00,
        prevClose: 1521.50,
        volume: 3200000,
        avgVolume: 2800000,
        marketCap: "₹4,20,000 Cr",
        peRatio: 24.5,
        pbRatio: 3.8,
        divYield: 1.05,
        high52: 1720.00,
        low52: 1180.00,
        description: `Comprehensive institutional profile for ${activeTicker}. Traded actively on National Stock Exchange of India (NSE) and Bombay Stock Exchange (BSE).`,
      }
    );
  }, [activeTicker, exchange]);

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
