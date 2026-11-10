import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TickerIndex {
  name: string;
  value: number;
  change: number;
  changePct: number;
}

const indices: TickerIndex[] = [
  { name: "NIFTY 50", value: 24345.80, change: 145.20, changePct: 0.60 },
  { name: "SENSEX", value: 79890.15, change: 420.50, changePct: 0.53 },
  { name: "BANK NIFTY", value: 51780.40, change: -110.25, changePct: -0.21 },
  { name: "NIFTY IT", value: 42150.30, change: 310.80, changePct: 0.74 },
  { name: "INDIA VIX", value: 13.45, change: -0.42, changePct: -3.03 },
  { name: "USD / INR", value: 84.38, change: 0.04, changePct: 0.05 },
];

export const MarketTicker: React.FC = () => {
  return (
    <div className="h-9 bg-[#0B1120] border-b border-[#26354B] flex items-center overflow-hidden px-4 select-none">
      <div className="flex items-center space-x-1 pr-3 border-r border-[#26354B] flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00C087] animate-pulse mr-1"></span>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#94A3B8]">
          INDICES
        </span>
      </div>

      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center space-x-6 px-4">
        {indices.map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <div
              key={idx.name}
              className="flex items-center space-x-2 text-xs flex-shrink-0 cursor-default hover:opacity-80 transition-opacity"
            >
              <span className="font-medium text-[#F1F5FC]">{idx.name}</span>
              <span className="font-mono-numbers text-[#F1F5FC]">
                {idx.value.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <div
                className={`flex items-center space-x-0.5 font-mono-numbers text-[11px] font-medium ${
                  isUp ? "text-[#00C087]" : "text-[#F04452]"
                }`}
              >
                {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                <span>
                  {isUp ? "+" : ""}
                  {idx.change.toFixed(2)}
                </span>
                <span>({isUp ? "+" : ""}{idx.changePct.toFixed(2)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

