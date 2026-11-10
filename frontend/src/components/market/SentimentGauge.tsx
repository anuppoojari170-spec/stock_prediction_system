import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  RefreshCw,
  Target,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { marketApi, predictionApi } from "../../services/api";
import { SentimentResponse, Prediction } from "../../types";
import { useAppStore } from "../../store/useAppStore";

interface SentimentGaugeProps {
  ticker?: string;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ ticker = "RELIANCE" }) => {
  const { setOrderSide, setOrderType, setOrderPrice, setTriggerPrice } = useAppStore();
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  // 1. Fetch Global Market Sentiment
  const {
    data: sentiment,
    refetch: refetchSentiment,
  } = useQuery<SentimentResponse>({
    queryKey: ["marketSentiment"],
    queryFn: marketApi.getSentiment,
    refetchInterval: 30000,
  });

  // 2. Fetch AI Multi-Indicator Technical Ensemble for active ticker
  const {
    data: prediction,
    isFetching: isPredFetching,
    refetch: refetchPrediction,
  } = useQuery<Prediction>({
    queryKey: ["stockPrediction", ticker],
    queryFn: () => predictionApi.analyzeStock(ticker),
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    refetchSentiment();
    refetchPrediction();
  };

  const handleApplyTradePlan = () => {
    if (!prediction?.trade_plan) return;
    const plan = prediction.trade_plan;
    setOrderSide(prediction.signal === "SELL" ? "SELL" : "BUY");
    setOrderType("LIMIT");
    setOrderPrice(plan.entry);
    setTriggerPrice(plan.stop_loss);
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2500);
  };

  const sentimentScore = sentiment?.score ?? 68;
  const sentimentLabel = sentiment?.label ?? "BULLISH";

  // Semicircular needle angle (-90deg to +90deg)
  const needleAngle = -90 + (sentimentScore / 100) * 180;
  const isBullish = sentimentLabel === "BULLISH";
  const isBearish = sentimentLabel === "BEARISH";

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case "BUY":
        return "bg-[#00C087]/20 text-[#00C087] border-[#00C087]/40";
      case "SELL":
        return "bg-[#F04452]/20 text-[#F04452] border-[#F04452]/40";
      default:
        return "bg-[#F5B942]/20 text-[#F5B942] border-[#F5B942]/40";
    }
  };

  const getSentimentPill = (sent: string) => {
    switch (sent) {
      case "BULLISH":
        return "text-[#00C087] bg-[#00C087]/15 border-[#00C087]/30";
      case "BEARISH":
        return "text-[#F04452] bg-[#F04452]/15 border-[#F04452]/30";
      default:
        return "text-[#F5B942] bg-[#F5B942]/15 border-[#F5B942]/30";
    }
  };

  return (
    <div className="nexus-card p-4 select-none relative overflow-hidden space-y-3.5">
      {/* Header with AI Brand Indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-[#26354B]">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-[#386BFF]/20 text-[#386BFF] shadow-sm">
            <Brain size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#F1F5FC]">
                AI Strategy Engine
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#386BFF] text-white">
                v3.0 Ensemble
              </span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">
              RSI • MACD • Bollinger • ATR Plan • News NLP
            </span>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-all"
          title="Refresh AI Ensemble Analysis"
        >
          <RefreshCw size={14} className={isPredFetching ? "animate-spin text-[#386BFF]" : ""} />
        </button>
      </div>

      {/* Semicircular SVG Gauge: Market Sentiment */}
      <div className="pt-2 pb-1 flex flex-col items-center">
        <div className="relative w-48 h-26 flex items-center justify-center">
          <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
            {/* Bearish Arc (Left) */}
            <path
              d="M 20 100 A 80 80 0 0 1 73 37"
              fill="none"
              stroke="#F04452"
              strokeWidth="12"
              strokeLinecap="round"
              className="opacity-75"
            />
            {/* Neutral Arc (Center) */}
            <path
              d="M 78 33 A 80 80 0 0 1 122 33"
              fill="none"
              stroke="#F5B942"
              strokeWidth="12"
              className="opacity-75"
            />
            {/* Bullish Arc (Right) */}
            <path
              d="M 127 37 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#00C087"
              strokeWidth="12"
              strokeLinecap="round"
              className="opacity-75"
            />

            {/* Gauge Needle */}
            <g
              transform={`translate(100, 100) rotate(${needleAngle})`}
              className="transition-transform duration-700 ease-out"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-68"
                stroke="#F1F5FC"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="0" cy="0" r="6" fill="#386BFF" stroke="#F1F5FC" strokeWidth="2" />
            </g>
          </svg>

          {/* Center Sentiment Pill */}
          <div className="absolute bottom-1 text-center font-mono-numbers">
            <span
              className={`text-sm font-extrabold tracking-wider ${
                isBullish ? "text-[#00C087]" : isBearish ? "text-[#F04452]" : "text-[#F5B942]"
              }`}
            >
              {sentimentLabel}
            </span>
            <span className="text-[10px] text-[#94A3B8] block">
              Market Score: {sentimentScore} / 100
            </span>
          </div>
        </div>

        {/* Labels below Gauge */}
        <div className="w-full flex justify-between text-[10px] font-mono px-4 text-[#94A3B8] -mt-1">
          <span className="text-[#F04452]">Bearish (0)</span>
          <span className="text-[#F5B942]">Neutral (50)</span>
          <span className="text-[#00C087]">Bullish (100)</span>
        </div>
      </div>

      {/* Stock Signal & Confidence Banner */}
      <div className="p-2.5 rounded-md bg-[#0B1120] border border-[#26354B] flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-[#F1F5FC] flex items-center space-x-1.5">
            <span>{ticker} Ensemble Signal</span>
          </div>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            Model Conviction: <strong className="text-[#F1F5FC]">{prediction?.confidence ?? 82}%</strong>
          </span>
        </div>

        {prediction && (
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold border font-mono tracking-wider ${getSignalBadge(
              prediction.signal
            )}`}
          >
            {prediction.recommendation}
          </span>
        )}
      </div>

      {/* Automated Trade Plan Card (Entry, Targets, Stop Loss, Risk/Reward) */}
      {prediction?.trade_plan && (
        <div className="p-3 rounded-md bg-[#0B1120] border border-[#386BFF]/30 relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F1F5FC] flex items-center space-x-1">
              <Target size={14} className="text-[#386BFF]" />
              <span>AI Trade Plan</span>
            </span>

            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#386BFF]/20 text-[#386BFF] border border-[#386BFF]/40">
              R:R {prediction.trade_plan.risk_reward}
            </span>
          </div>

          {/* Price Targets Ladder */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-numbers pt-1">
            <div className="p-1.5 rounded bg-[#111C30] border border-[#26354B]">
              <span className="text-[10px] text-[#94A3B8] block">Entry Level</span>
              <span className="font-bold text-[#F1F5FC] block mt-0.5">
                ₹{prediction.trade_plan.entry.toFixed(2)}
              </span>
            </div>

            <div className="p-1.5 rounded bg-[#111C30] border border-[#F04452]/30">
              <span className="text-[10px] text-[#F04452] block">Stop Loss (SL)</span>
              <span className="font-bold text-[#F04452] block mt-0.5">
                ₹{prediction.trade_plan.stop_loss.toFixed(2)}
              </span>
            </div>

            <div className="p-1.5 rounded bg-[#111C30] border border-[#00C087]/30">
              <span className="text-[10px] text-[#00C087] block">Target 1</span>
              <span className="font-bold text-[#00C087] block mt-0.5">
                ₹{prediction.trade_plan.target_1.toFixed(2)}
              </span>
            </div>

            <div className="p-1.5 rounded bg-[#111C30] border border-[#00C087]/30">
              <span className="text-[10px] text-[#00C087] block">Target 2 (Ext.)</span>
              <span className="font-bold text-[#00C087] block mt-0.5">
                ₹{prediction.trade_plan.target_2.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 1-Click Order Form Injection */}
          <button
            onClick={handleApplyTradePlan}
            className="w-full mt-2 py-1.5 rounded bg-[#386BFF]/20 hover:bg-[#386BFF] text-[#386BFF] hover:text-white text-xs font-semibold border border-[#386BFF]/40 transition-all flex items-center justify-center space-x-1.5"
          >
            {appliedFeedback ? (
              <>
                <CheckCircle2 size={13} />
                <span>Trade Plan Applied to Order Panel!</span>
              </>
            ) : (
              <>
                <Sliders size={13} />
                <span>Apply Levels to Order Entry</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Multi-Indicator Technical Breakdown Accordion */}
      <div className="pt-2 border-t border-[#26354B]">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5FC] transition-colors pb-1"
        >
          <span className="flex items-center space-x-1">
            <Layers size={13} className="text-[#386BFF]" />
            <span>Indicator Consensus Breakdown</span>
          </span>
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showDetails && prediction?.breakdown && (
          <div className="space-y-1.5 mt-2">
            {prediction.breakdown.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-[#0B1120] border border-[#26354B]/60 flex items-center justify-between text-xs font-mono-numbers"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#F1F5FC] text-[11px] font-sans">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-[#94A3B8]">Weight {item.weight}</span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">{item.value}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSentimentPill(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
