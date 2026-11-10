import React from "react";
import {
  BarChart3,
  TrendingUp,
  Award,
  Target,
  ShieldAlert,
} from "lucide-react";

const monthlyReturns = [
  { month: "Jan", returnPct: 4.2 },
  { month: "Feb", returnPct: -1.5 },
  { month: "Mar", returnPct: 6.8 },
  { month: "Apr", returnPct: 3.4 },
  { month: "May", returnPct: 5.1 },
  { month: "Jun", returnPct: -0.8 },
  { month: "Jul", returnPct: 7.4 },
  { month: "Aug", returnPct: 2.9 },
  { month: "Sep", returnPct: -2.1 },
  { month: "Oct", returnPct: 4.8 },
  { month: "Nov", returnPct: 3.2 },
];

export const AnalyticsView: React.FC = () => {
  return (
    <div className="space-y-4 select-none">
      {/* 4 Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nexus-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Win Rate</span>
            <Target size={16} className="text-[#00C087]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-[#00C087] mt-1">
            68.4%
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">39 Wins of 57 Trades</span>
        </div>

        <div className="nexus-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Profit Factor</span>
            <Award size={16} className="text-[#386BFF]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-[#386BFF] mt-1">
            2.14
          </div>
          <span className="text-[11px] text-[#94A3B8] mt-1 block">Gross Profit / Gross Loss</span>
        </div>

        <div className="nexus-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Avg. Winning Trade</span>
            <TrendingUp size={16} className="text-[#00C087]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            ₹4,250.00
          </div>
          <span className="text-[11px] text-[#00C087] mt-1 block">Max Win: ₹14,800.00</span>
        </div>

        <div className="nexus-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Avg. Losing Trade</span>
            <ShieldAlert size={16} className="text-[#F04452]" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-[#F1F5FC] mt-1">
            -₹1,820.00
          </div>
          <span className="text-[11px] text-[#F04452] mt-1 block">Max Loss: -₹4,500.00</span>
        </div>
      </div>

      {/* Monthly Returns Bar Chart Visualization */}
      <div className="nexus-card p-4">
        <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#26354B]">
          <div>
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC] flex items-center space-x-2">
              <BarChart3 size={16} className="text-[#386BFF]" />
              <span>Monthly Returns Breakdown (2024 YTD)</span>
            </h3>
            <span className="text-xs text-[#94A3B8]">Cumulative Portfolio Alpha vs NIFTY 50</span>
          </div>

          <div className="flex items-center space-x-2 font-mono-numbers text-xs">
            <span className="text-[#00C087] font-bold">+28.4% YTD Return</span>
          </div>
        </div>

        {/* Custom Bar Visualization */}
        <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-[#26354B]">
          {monthlyReturns.map((m) => {
            const isPos = m.returnPct >= 0;
            const barHeight = `${Math.min(100, Math.abs(m.returnPct) * 11)}%`;

            return (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                <span className="text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-[#F1F5FC]">
                  {isPos ? "+" : ""}{m.returnPct}%
                </span>
                <div
                  className={`w-full max-w-[32px] rounded-t transition-all ${
                    isPos ? "bg-[#00C087] group-hover:bg-[#00d97e]" : "bg-[#F04452] group-hover:bg-[#ff4d5e]"
                  }`}
                  style={{ height: barHeight }}
                />
                <span className="text-[11px] font-medium text-[#94A3B8] mt-2">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Metrics & Trade Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="nexus-card p-4">
          <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-3">
            Institutional Risk Metrics
          </h3>
          <div className="space-y-2.5 text-xs font-mono-numbers">
            <div className="flex justify-between py-1 border-b border-[#26354B]/30">
              <span className="text-[#94A3B8]">Sharpe Ratio (Annualized):</span>
              <span className="font-bold text-[#F1F5FC]">1.88</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#26354B]/30">
              <span className="text-[#94A3B8]">Sortino Ratio:</span>
              <span className="font-bold text-[#F1F5FC]">2.42</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#26354B]/30">
              <span className="text-[#94A3B8]">Maximum Drawdown (MDD):</span>
              <span className="font-bold text-[#F04452]">-6.4%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#94A3B8]">Beta (vs NIFTY 50):</span>
              <span className="font-bold text-[#F1F5FC]">0.82</span>
            </div>
          </div>
        </div>

        <div className="nexus-card p-4">
          <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-3">
            Execution Efficiency
          </h3>
          <div className="space-y-2.5 text-xs font-mono-numbers">
            <div className="flex justify-between py-1 border-b border-[#26354B]/30">
              <span className="text-[#94A3B8]">Average Slippage:</span>
              <span className="font-bold text-[#00C087]">0.02%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#26354B]/30">
              <span className="text-[#94A3B8]">Fill Rate:</span>
              <span className="font-bold text-[#F1F5FC]">99.4%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#26354B]/30">
              <span className="text-[#94A3B8]">Average Trade Duration:</span>
              <span className="font-bold text-[#F1F5FC]">4.2 Days (Delivery)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#94A3B8]">Intraday Auto-Squareoff Rate:</span>
              <span className="font-bold text-[#F1F5FC]">0.0% (Manual Exit)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
