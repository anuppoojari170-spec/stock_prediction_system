import React, { useState } from "react";
import {
  Search,
  PieChart,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { Holding } from "../../types";

const defaultHoldings: Holding[] = [
  {
    ticker: "RELIANCE",
    companyName: "Reliance Industries Ltd",
    shares: 100,
    avg_price: 2680.00,
    current_price: 2984.50,
    invested: 268000.00,
    current_value: 298450.00,
    pnl: 30450.00,
    pnl_pct: 11.36,
    day_pnl: 3820.00,
    day_pnl_pct: 1.30,
  },
  {
    ticker: "TCS",
    companyName: "Tata Consultancy Services",
    shares: 60,
    avg_price: 3850.00,
    current_price: 4120.75,
    invested: 231000.00,
    current_value: 247245.00,
    pnl: 16245.00,
    pnl_pct: 7.03,
    day_pnl: 2718.00,
    day_pnl_pct: 1.11,
  },
  {
    ticker: "HDFCBANK",
    companyName: "HDFC Bank Limited",
    shares: 150,
    avg_price: 1620.00,
    current_price: 1742.30,
    invested: 243000.00,
    current_value: 261345.00,
    pnl: 18345.00,
    pnl_pct: 7.55,
    day_pnl: -1260.00,
    day_pnl_pct: -0.48,
  },
  {
    ticker: "INFY",
    companyName: "Infosys Limited",
    shares: 120,
    avg_price: 1680.00,
    current_price: 1865.10,
    invested: 201600.00,
    current_value: 223812.00,
    pnl: 22212.00,
    pnl_pct: 11.02,
    day_pnl: 2736.00,
    day_pnl_pct: 1.24,
  },
  {
    ticker: "ICICIBANK",
    companyName: "ICICI Bank Limited",
    shares: 140,
    avg_price: 1150.00,
    current_price: 1268.90,
    invested: 161000.00,
    current_value: 177646.00,
    pnl: 16646.00,
    pnl_pct: 10.34,
    day_pnl: 2030.00,
    day_pnl_pct: 1.16,
  },
  {
    ticker: "TATAMOTORS",
    companyName: "Tata Motors Limited",
    shares: 150,
    avg_price: 920.00,
    current_price: 988.40,
    invested: 138000.00,
    current_value: 148260.00,
    pnl: 10260.00,
    pnl_pct: 7.43,
    day_pnl: 1890.00,
    day_pnl_pct: 1.29,
  },
  {
    ticker: "ITC",
    companyName: "ITC Limited",
    shares: 200,
    avg_price: 450.00,
    current_price: 476.85,
    invested: 90000.00,
    current_value: 95370.00,
    pnl: 5370.00,
    pnl_pct: 5.97,
    day_pnl: 390.00,
    day_pnl_pct: 0.41,
  },
];

const sectorBreakdown = [
  { name: "Information Technology", pct: 32.5, color: "#386BFF" },
  { name: "Banking & Financials", pct: 29.8, color: "#7657F6" },
  { name: "Energy & Conglomerate", pct: 20.6, color: "#00C087" },
  { name: "Automotive", pct: 10.5, color: "#F5B942" },
  { name: "FMCG", pct: 6.6, color: "#38BDF8" },
];

export const PortfolioView: React.FC = () => {
  const { setActiveTicker, setOrderSide, setActiveTab } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"pnl" | "value" | "ticker">("value");

  const totalInvested = defaultHoldings.reduce((acc, h) => acc + h.invested, 0);
  const totalValue = defaultHoldings.reduce((acc, h) => acc + h.current_value, 0);
  const totalPnl = totalValue - totalInvested;
  const growthPct = (totalPnl / totalInvested) * 100;
  const todaysPnl = defaultHoldings.reduce((acc, h) => acc + (h.day_pnl || 0), 0);

  const filteredHoldings = defaultHoldings
    .filter(
      (h) =>
        h.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.companyName && h.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "pnl") return b.pnl - a.pnl;
      if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
      return b.current_value - a.current_value;
    });

  return (
    <div className="space-y-4 select-none">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Total Investment</span>
          <div className="text-xl md:text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹{totalInvested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">In 7 Equity Holdings</span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Current Valuation</span>
          <div className="text-xl md:text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#00C087] mt-1 block font-mono-numbers">
            +₹{todaysPnl.toLocaleString("en-IN")} Today (+1.32%)
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Overall Profit / Loss</span>
          <div className="text-xl md:text-2xl font-bold font-mono-numbers text-[#00C087] mt-1">
            +₹{totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#00C087] mt-1 block font-mono-numbers">
            +{growthPct.toFixed(2)}% Net Growth
          </span>
        </div>

        <div className="nexus-card p-4">
          <span className="text-xs text-[#94A3B8]">Today's P&L</span>
          <div className="text-xl md:text-2xl font-bold font-mono-numbers text-[#00C087] mt-1">
            +₹{todaysPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Live Unbooked Gain</span>
        </div>
      </div>

      {/* Sector Allocation Visual Bar */}
      <div className="nexus-card p-4">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#26354B]">
          <h3 className="font-heading font-bold text-sm text-[#F1F5FC] flex items-center space-x-2">
            <PieChart size={16} className="text-[#386BFF]" />
            <span>Sector & Asset Allocation</span>
          </h3>
          <span className="text-xs text-[#94A3B8] font-mono">100% Equity Diversification</span>
        </div>

        {/* Visual Multi-Color Bar */}
        <div className="w-full h-3 rounded-full bg-[#1A2940] flex overflow-hidden mb-3">
          {sectorBreakdown.map((s, idx) => (
            <div
              key={idx}
              className="h-full transition-all duration-500"
              style={{ width: `${s.pct}%`, backgroundColor: s.color }}
              title={`${s.name}: ${s.pct}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-numbers">
          {sectorBreakdown.map((s, idx) => (
            <div key={idx} className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
              <span className="text-[#94A3B8]">{s.name}:</span>
              <span className="font-semibold text-[#F1F5FC]">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings Table with Filter & Search */}
      <div className="nexus-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#26354B]">
          <div>
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Holdings Breakdown ({filteredHoldings.length})
            </h3>
            <span className="text-xs text-[#94A3B8]">Long-Term Delivery Portfolios</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search holdings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
            >
              <option value="value">Sort: Value</option>
              <option value="pnl">Sort: Returns</option>
              <option value="ticker">Sort: Symbol</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
                <th className="py-2 px-3">Security</th>
                <th className="py-2 px-3 text-right">Shares</th>
                <th className="py-2 px-3 text-right">Avg. Price</th>
                <th className="py-2 px-3 text-right">LTP</th>
                <th className="py-2 px-3 text-right">Invested</th>
                <th className="py-2 px-3 text-right">Current Value</th>
                <th className="py-2 px-3 text-right">Day P&L</th>
                <th className="py-2 px-3 text-right">Total Returns</th>
                <th className="py-2 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
              {filteredHoldings.map((h) => {
                const isPnlUp = h.pnl >= 0;
                const isDayUp = (h.day_pnl || 0) >= 0;

                return (
                  <tr key={h.ticker} className="hover:bg-[#1A2940]/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#F1F5FC]">{h.ticker}</div>
                      <div className="text-[10px] text-[#94A3B8] font-sans truncate max-w-[140px]">
                        {h.companyName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#F1F5FC]">
                      {h.shares}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                      ₹{h.avg_price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#F1F5FC]">
                      ₹{h.current_price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                      ₹{h.invested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#F1F5FC]">
                      ₹{h.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={isDayUp ? "text-[#00C087]" : "text-[#F04452]"}>
                        {isDayUp ? "+" : ""}₹{h.day_pnl?.toFixed(2)} ({isDayUp ? "+" : ""}
                        {h.day_pnl_pct?.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={isPnlUp ? "text-[#00C087]" : "text-[#F04452]"}>
                        {isPnlUp ? "+" : ""}₹
                        {h.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (
                        {isPnlUp ? "+" : ""}
                        {h.pnl_pct.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5 font-sans">
                        <button
                          onClick={() => {
                            setActiveTicker(h.ticker);
                            setOrderSide("BUY");
                            setActiveTab("overview");
                          }}
                          className="px-2 py-1 rounded bg-[#386BFF] hover:bg-[#4C7DFF] text-white text-[10px] font-semibold"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setActiveTicker(h.ticker);
                            setOrderSide("SELL");
                            setActiveTab("overview");
                          }}
                          className="px-2 py-1 rounded bg-[#F04452] hover:bg-[#ff5a68] text-white text-[10px] font-semibold"
                        >
                          Exit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
