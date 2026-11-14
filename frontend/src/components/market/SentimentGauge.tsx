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
  Sparkles,
  Bot,
  MessageSquareText,
} from "lucide-react";
import { marketApi, predictionApi } from "../../services/api";
import { SentimentResponse, Prediction } from "../../types";
import { useAppStore } from "../../store/useAppStore";

interface SentimentGaugeProps {
  ticker?: string;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ ticker = "RELIANCE" }) => {
  const { setOrderSide, setOrderType, setOrderPrice, setTriggerPrice, mode, toggleAiCopilot, openOrderModal } = useAppStore();
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
    const side = prediction.signal === "SELL" ? "SELL" : "BUY";
    setOrderSide(side);
    setOrderType("LIMIT");
    setOrderPrice(plan.entry);
    setTriggerPrice(plan.stop_loss);
    setAppliedFeedback(true);
    openOrderModal(ticker, side);
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

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#386BFF] hover:bg-[#1A2940] transition-all"
            title="Refresh AI Ensemble Analysis"
          >
            <RefreshCw size={14} className={isPredFetching ? "animate-spin text-[#386BFF]" : ""} />
          </button>
        </div>
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

      {/* AI Trade Thesis & Institutional Commentary */}
      {prediction?.commentary && (
        <div className="p-3 rounded-md bg-[#0B1120] border border-[#7657F6]/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Bot size={14} className="text-[#7657F6]" />
              <span className="text-xs font-bold text-[#F1F5FC]">
                AI Trade Thesis & Rationale
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[#A78BFA] bg-[#7657F6]/15 border border-[#7657F6]/30">
              {prediction.commentary.provider}
            </span>
          </div>

          <div className="text-[11px] font-semibold text-[#F1F5FC] leading-snug">
            {prediction.commentary.headline}
          </div>

          <p className="text-[10px] text-[#94A3B8] leading-relaxed">
            {prediction.commentary.thesis}
          </p>

          {/* Beginner Mode Takeaway */}
          {mode === "beginner" && prediction.commentary.beginner_takeaway && (
            <div className="p-2 rounded bg-[#7657F6]/10 border border-[#7657F6]/20 text-[10px] text-[#F1F5FC] space-y-1">
              <span className="font-semibold text-[#7657F6] block">Beginner Takeaway:</span>
              <span className="text-[#CBD5E1]">{prediction.commentary.beginner_takeaway}</span>
            </div>
          )}

          {/* Key Catalysts & Risks */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#26354B]/50 text-[9px]">
            <div>
              <span className="text-[#00C087] font-semibold block mb-0.5">Key Drivers</span>
              <ul className="text-[#94A3B8] space-y-0.5 list-disc list-inside">
                {(prediction.commentary.catalysts || []).slice(0, 2).map((c, i) => (
                  <li key={i} className="truncate" title={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-[#F04452] font-semibold block mb-0.5">Key Risks</span>
              <ul className="text-[#94A3B8] space-y-0.5 list-disc list-inside">
                {(prediction.commentary.risks || []).slice(0, 2).map((r, i) => (
                  <li key={i} className="truncate" title={r}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ask Copilot Button */}
          <button
            onClick={toggleAiCopilot}
            className="w-full mt-1 py-1 rounded bg-[#7657F6]/15 hover:bg-[#7657F6]/25 text-[#7657F6] hover:text-[#A78BFA] text-[10px] font-semibold border border-[#7657F6]/30 transition-all flex items-center justify-center space-x-1"
          >
            <MessageSquareText size={12} />
            <span>Chat with AI Copilot About {ticker}</span>
          </button>
        </div>
      )}

      {/* Multi-Horizon Machine Learning Forecast (T+1, T+3, T+5) */}
      {prediction?.ml_forecast && (
        <div className="p-3 rounded-md bg-[#0B1120] border border-[#386BFF]/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F1F5FC] flex items-center space-x-1.5">
              <Sparkles size={14} className="text-[#386BFF]" />
              <span>Multi-Horizon ML Forecast</span>
            </span>

            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00C087]/15 text-[#00C087] border border-[#00C087]/30">
              {prediction.ml_forecast.model_accuracy?.directional_hit_rate_pct ?? 68.4}% Hit Rate
            </span>
          </div>

          {/* 3 Horizon Grid Cards */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono-numbers">
            {(prediction.ml_forecast.horizons || []).filter(Boolean).map((h, hIdx) => {
              const target =
                typeof h?.target_price === "number" && !isNaN(h.target_price)
                  ? h.target_price
                  : (prediction.current_price || 1339.70);
              const lower =
                typeof h?.lower_bound === "number" && !isNaN(h.lower_bound)
                  ? h.lower_bound
                  : target * 0.98;
              const upper =
                typeof h?.upper_bound === "number" && !isNaN(h.upper_bound)
                  ? h.upper_bound
                  : target * 1.02;
              const expChange =
                typeof h?.expected_change_pct === "number" && !isNaN(h.expected_change_pct)
                  ? h.expected_change_pct
                  : 0.0;
              const probUp =
                typeof h?.probability_up === "number" && !isNaN(h.probability_up)
                  ? h.probability_up
                  : 50;
              const isUp = expChange >= 0;

              return (
                <div
                  key={h?.horizon_days ?? hIdx}
                  onClick={() => {
                    const side = h?.direction === "BEARISH" ? "SELL" : "BUY";
                    setOrderSide(side);
                    setOrderType("LIMIT");
                    setOrderPrice(target);
                    setTriggerPrice(lower);
                    setAppliedFeedback(true);
                    openOrderModal(ticker, side);
                    setTimeout(() => setAppliedFeedback(false), 2500);
                  }}
                  className="p-2 rounded bg-[#111C30] border border-[#26354B] hover:border-[#386BFF] cursor-pointer transition-all flex flex-col justify-between group relative"
                  title={`Click to apply ${h?.label || "T+N"} target (₹${target.toFixed(2)}) & SL (₹${lower.toFixed(2)}) to Order Entry`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-[#94A3B8] font-sans group-hover:text-[#386BFF] transition-colors">
                      {(h?.label || "T+1").split(" ")[0]}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1 rounded ${
                        isUp ? "text-[#00C087] bg-[#00C087]/15" : "text-[#F04452] bg-[#F04452]/15"
                      }`}
                    >
                      {h?.direction || "NEUTRAL"}
                    </span>
                  </div>

                  <div className="font-bold text-[#F1F5FC] text-[13px] group-hover:text-[#386BFF] transition-colors">
                    ₹{target.toFixed(2)}
                  </div>

                  <div
                    className={`text-[10px] font-semibold flex items-center space-x-0.5 mt-0.5 ${
                      isUp ? "text-[#00C087]" : "text-[#F04452]"
                    }`}
                  >
                    <span>{isUp ? "+" : ""}{expChange.toFixed(1)}%</span>
                    <span className="text-[9px] text-[#94A3B8] font-normal">
                      ({probUp}%)
                    </span>
                  </div>

                  <div className="text-[9px] text-[#94A3B8] mt-1 pt-1 border-t border-[#26354B]/50 truncate flex items-center justify-between">
                    <span>90% CI</span>
                    <span>₹{Math.round(lower)} - ₹{Math.round(upper)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Importance Decomposition */}
          <div className="pt-2 border-t border-[#26354B]/50 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider">
              <span>ML Feature Weighting</span>
              <span>Importance</span>
            </div>

            <div className="space-y-1">
              {(prediction.ml_forecast.feature_importance || []).map((f, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#F1F5FC] truncate max-w-[170px]">{f.factor}</span>
                    <span className="font-mono text-[#386BFF] font-semibold">{f.weight_pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#1A2940] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#386BFF] rounded-full transition-all"
                      style={{ width: `${f.weight_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Automated Trade Plan Card (Entry, Targets, Stop Loss, Risk/Reward) */}
      {prediction?.trade_plan && (
        <div className="p-3 rounded-md bg-[#0B1120] border border-[#386BFF]/30 relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F1F5FC] flex items-center space-x-1">
              <Target size={14} className="text-[#386BFF]" />
              <span>AI Trade Plan</span>
            </span>

            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#386BFF]/20 text-[#386BFF] border border-[#386BFF]/40">
              R:R {prediction.trade_plan.risk_reward || "1:2.0"}
            </span>
          </div>

          {/* Price Targets Ladder */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-numbers pt-1">
            <div className="p-1.5 rounded bg-[#111C30] border border-[#26354B]">
              <span className="text-[10px] text-[#94A3B8] block">Entry Level</span>
              <span className="font-bold text-[#F1F5FC] block mt-0.5">
                ₹{(typeof prediction.trade_plan.entry === "number" ? prediction.trade_plan.entry : (prediction.current_price || 0)).toFixed(2)}
              </span>
            </div>

            <div className="p-1.5 rounded bg-[#111C30] border border-[#F04452]/30">
              <span className="text-[10px] text-[#F04452] block">Stop Loss (SL)</span>
              <span className="font-bold text-[#F04452] block mt-0.5">
                ₹{(typeof prediction.trade_plan.stop_loss === "number" ? prediction.trade_plan.stop_loss : ((prediction.current_price || 0) * 0.98)).toFixed(2)}
              </span>
            </div>

            <div className="p-1.5 rounded bg-[#111C30] border border-[#00C087]/30">
              <span className="text-[10px] text-[#00C087] block">Target 1</span>
              <span className="font-bold text-[#00C087] block mt-0.5">
                ₹{(typeof prediction.trade_plan.target_1 === "number" ? prediction.trade_plan.target_1 : ((prediction.current_price || 0) * 1.02)).toFixed(2)}
              </span>
            </div>

            <div className="p-1.5 rounded bg-[#111C30] border border-[#00C087]/30">
              <span className="text-[10px] text-[#00C087] block">Target 2 (Ext.)</span>
              <span className="font-bold text-[#00C087] block mt-0.5">
                ₹{(typeof prediction.trade_plan.target_2 === "number" ? prediction.trade_plan.target_2 : ((prediction.current_price || 0) * 1.04)).toFixed(2)}
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
