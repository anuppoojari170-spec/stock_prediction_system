import React from "react";
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export const PortfolioSummaryCards: React.FC = () => {
  const { virtualBalance, usedMargin, mode } = useAppStore();

  const totalInvested = 1245000.00;
  const currentPortfolioValue = 1418520.50;
  const totalPnl = currentPortfolioValue - totalInvested;
  const growthPct = (totalPnl / totalInvested) * 100;
  const todaysPnl = 18450.00;
  const todaysGrowthPct = 1.32;
  const isPnlPositive = totalPnl >= 0;

  const cards = [
    {
      title: "Total Investment",
      amount: totalInvested,
      subtext: "Across 8 Holdings",
      icon: Briefcase,
      tooltip: "The total capital you have invested to buy shares in your portfolio.",
      highlight: null,
    },
    {
      title: "Current Portfolio Value",
      amount: currentPortfolioValue,
      subtext: `Today: +₹${todaysPnl.toLocaleString("en-IN")} (+${todaysGrowthPct}%)`,
      icon: DollarSign,
      tooltip: "The present market valuation of all your equity shares at current market prices.",
      highlight: "profit",
    },
    {
      title: "Total Profit / Loss",
      amount: totalPnl,
      subtext: `${isPnlPositive ? "+" : ""}${growthPct.toFixed(2)}% Overall Returns`,
      icon: TrendingUp,
      tooltip: "Net gain or loss from your investments since purchase.",
      highlight: isPnlPositive ? "profit" : "loss",
      isPnl: true,
    },
    {
      title: "Available Margin",
      amount: virtualBalance,
      subtext: `Used Margin: ₹${usedMargin.toLocaleString("en-IN")}`,
      icon: Wallet,
      tooltip: "Unused liquid funds available immediately to place new equity or intraday orders.",
      highlight: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={idx}
            className="nexus-card p-4 flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#94A3B8] flex items-center space-x-1.5">
                <span>{card.title}</span>
                {mode === "beginner" && (
                  <span title={card.tooltip} className="cursor-help text-[#64748B] hover:text-[#386BFF]">
                    <HelpCircle size={13} />
                  </span>
                )}
              </span>

              <div className="p-2 rounded-md bg-[#1A2940] text-[#386BFF] group-hover:bg-[#386BFF] group-hover:text-white transition-colors">
                <Icon size={16} />
              </div>
            </div>

            {/* Financial value */}
            <div className="mt-2 font-mono-numbers">
              <div
                className={`text-xl md:text-2xl font-bold tracking-tight ${
                  card.isPnl
                    ? isPnlPositive
                      ? "text-[#00C087]"
                      : "text-[#F04452]"
                    : "text-[#F1F5FC]"
                }`}
              >
                {card.isPnl && (isPnlPositive ? "+" : "")}₹
                {Math.abs(card.amount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              <div className="flex items-center space-x-1 text-xs mt-1">
                {card.isPnl && (
                  <span className={isPnlPositive ? "text-[#00C087]" : "text-[#F04452]"}>
                    {isPnlPositive ? <ArrowUpRight size={14} className="inline" /> : <ArrowDownRight size={14} className="inline" />}
                  </span>
                )}
                <span
                  className={
                    card.highlight === "profit"
                      ? "text-[#00C087]"
                      : card.highlight === "loss"
                      ? "text-[#F04452]"
                      : "text-[#94A3B8]"
                  }
                >
                  {card.subtext}
                </span>
              </div>
            </div>

            {/* Subtle blue bottom highlight */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#386BFF]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        );
      })}
    </div>
  );
};

