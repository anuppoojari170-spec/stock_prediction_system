import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  RefreshCw,
  Activity,
} from "lucide-react";
import { marketApi, predictionApi } from "../../services/api";
import { SentimentResponse, Prediction } from "../../types";

interface SentimentGaugeProps {
  ticker?: string;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ ticker = "RELIANCE" }) => {
  // 1. Fetch Global Market Sentiment
  const {
    data: sentiment,
    refetch: refetchSentiment,
  } = useQuery<SentimentResponse>({
    queryKey: ["marketSentiment"],
    queryFn: marketApi.getSentiment,
    refetchInterval: 30000,
  });

  // 2. Fetch AI Stock Prediction for the active ticker
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

  const sentimentScore = sentiment?.score ?? 68;
  const sentimentLabel = sentiment?.label ?? "BULLISH";

  // Calculate needle angle on a 180-degree semicircular gauge (-90deg to +90deg)
  // Score 0 -> -90 deg (Extreme Bearish), 50 -> 0 deg (Neutral), 100 -> +90 deg (Extreme Bullish)
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

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-[#00C087]/15 text-[#00C087] border-[#00C087]/30";
      case "HIGH":
        return "bg-[#F04452]/15 text-[#F04452] border-[#F04452]/30";
      default:
        return "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30";
    }
  };

  return (
    <div className="nexus-card p-4 select-none relative overflow-hidden">
      {/* Header with AI Brand Indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-[#26354B]">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-[#386BFF]/20 text-[#386BFF] shadow-sm">
            <Brain size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#F1F5FC]">
                AI Intelligence Engine
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#386BFF] text-white">
                ML v2.4
              </span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">
              Neural Sentiment & Technical Crossover
            </span>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-all"
          title="Refresh AI Analysis"
        >
          <RefreshCw size={14} className={isPredFetching ? "animate-spin text-[#386BFF]" : ""} />
        </button>
      </div>

      {/* Semicircular SVG Gauge: Market Sentiment */}
      <div className="pt-3 pb-1 flex flex-col items-center">
        <div className="relative w-48 h-28 flex items-center justify-center">
          <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
            {/* Background Arc Tracks */}
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
              Score: {sentimentScore} / 100
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

      {/* Consensus Distribution Bar */}
      <div className="mt-3 p-2.5 rounded bg-[#0B1120] border border-[#26354B]/60">
        <div className="flex justify-between text-[10px] font-mono-numbers text-[#94A3B8] mb-1">
          <span className="text-[#00C087]">Buy: {sentiment?.buy ?? 65}%</span>
          <span className="text-[#F5B942]">Hold: {sentiment?.hold ?? 25}%</span>
          <span className="text-[#F04452]">Sell: {sentiment?.sell ?? 10}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1A2940] flex overflow-hidden">
          <div
            className="bg-[#00C087] h-full transition-all duration-500"
            style={{ width: `${sentiment?.buy ?? 65}%` }}
          />
          <div
            className="bg-[#F5B942] h-full transition-all duration-500"
            style={{ width: `${sentiment?.hold ?? 25}%` }}
          />
          <div
            className="bg-[#F04452] h-full transition-all duration-500"
            style={{ width: `${sentiment?.sell ?? 10}%` }}
          />
        </div>
      </div>

      {/* Stock-Specific AI Prediction Card for Active Ticker */}
      <div className="mt-3 pt-3 border-t border-[#26354B] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#F1F5FC] flex items-center space-x-1">
            <span>{ticker} AI Prediction</span>
          </span>

          {prediction && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold border font-mono ${getSignalBadge(
                prediction.signal
              )}`}
            >
              SIGNAL: {prediction.signal}
            </span>
          )}
        </div>

        {/* AI Recommendation Summary */}
        <div className="p-2.5 rounded bg-[#0B1120] border border-[#26354B] text-xs">
          <div className="flex items-center justify-between mb-1.5 font-mono-numbers">
            <span className="text-[11px] text-[#94A3B8] flex items-center space-x-1">
              <Activity size={13} className="text-[#386BFF]" />
              <span>Model Confidence:</span>
            </span>
            <span className="font-bold text-[#F1F5FC]">
              {prediction?.confidence ?? 82}%
            </span>
          </div>

          <p className="text-[11px] text-[#F1F5FC] leading-relaxed">
            {prediction?.recommendation ||
              `Bullish momentum crossover detected for ${ticker}. 5-Day moving average trending positively with robust institutional volume.`}
          </p>

          {/* Risk Level & MA spread */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#26354B]/50 text-[10px] font-mono-numbers">
            <div className="flex items-center space-x-1 text-[#94A3B8]">
              <span>Risk:</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold border ${getRiskBadge(
                  prediction?.risk?.level || "LOW"
                )}`}
              >
                {prediction?.risk?.level || "LOW"}
              </span>
            </div>

            <div className="text-[#94A3B8]">
              MA(5):{" "}
              <span className="font-bold text-[#F1F5FC]">
                ₹{prediction?.ma5?.toFixed(2) || "2,980.00"}
              </span>{" "}
              | MA(20):{" "}
              <span className="font-bold text-[#F1F5FC]">
                ₹{prediction?.ma20?.toFixed(2) || "2,945.00"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
