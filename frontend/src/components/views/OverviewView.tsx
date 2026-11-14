import React from "react";
import { PortfolioSummaryCards } from "../dashboard/PortfolioSummaryCards";
import { MarketOverview } from "../market/MarketOverview";
import { SentimentGauge } from "../market/SentimentGauge";
import { TradingChart } from "../chart/TradingChart";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { MarketDepth } from "../trading/MarketDepth";
import { WatchlistWidget } from "../watchlist/WatchlistWidget";
import { RecentOrdersWidget } from "../trading/RecentOrdersWidget";
import { useAppStore } from "../../store/useAppStore";
import { ShieldCheck } from "lucide-react";

export const OverviewView: React.FC = () => {
  const { activeTicker, mode } = useAppStore();

  return (
    <div className="space-y-4">
      {/* Beginner Welcome Banner */}
      {mode === "beginner" && (
        <div className="p-3.5 rounded-md bg-[#7657F6]/10 border border-[#7657F6]/30 flex items-center justify-between text-xs text-[#F1F5FC]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck size={18} className="text-[#7657F6] flex-shrink-0" />
            <div>
              <span className="font-semibold text-[#7657F6]">
                Beginner Mode Active:
              </span>{" "}
              AI-assisted risk alerts, simplified indicators, and educational explanations enabled.
            </div>
          </div>
        </div>
      )}

      {/* 4 Top KPI Cards */}
      <PortfolioSummaryCards />

      {/* AI Market Overview & Top Movers */}
      <MarketOverview />

      {/* Main Trading Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Columns: Main Chart + Market Depth & Recent Orders + Watchlist Table */}
        <div className="lg:col-span-8 space-y-4">
          <ErrorBoundary fallbackTitle="Interactive Trading Chart">
            <TradingChart ticker={activeTicker} />
          </ErrorBoundary>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MarketDepth ticker={activeTicker} />
            <RecentOrdersWidget />
          </div>

          {/* Watchlist Table (Moved below Market Depth) */}
          <WatchlistWidget />
        </div>

        {/* Right 4 Columns: AI Sentiment Engine */}
        <div className="lg:col-span-4 space-y-4">
          {/* Core AI Intelligence Sentiment & Prediction Gauge */}
          <ErrorBoundary fallbackTitle="AI Sentiment & Prediction Engine">
            <SentimentGauge ticker={activeTicker} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};
