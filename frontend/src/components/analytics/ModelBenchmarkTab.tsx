import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Cpu,
  Layers,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { backtestApi } from "../../services/api";
import {
  BenchmarkResponse,
  ModelMetric,
  MultiModelEquityPoint,
} from "../../types";
import { useAppStore } from "../../store/useAppStore";

const POPULAR_TICKERS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"];

export const ModelBenchmarkTab: React.FC = () => {
  const activeGlobalTicker = useAppStore((state) => state.activeTicker);

  const [ticker, setTicker] = useState<string>(activeGlobalTicker || "RELIANCE");
  const [period, setPeriod] = useState<string>("1y");
  const [horizon, setHorizon] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResponse | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Sync with active ticker from global store
  useEffect(() => {
    if (activeGlobalTicker && activeGlobalTicker !== ticker) {
      setTicker(activeGlobalTicker);
    }
  }, [activeGlobalTicker]);

  // Initial benchmark run
  useEffect(() => {
    runBenchmark();
  }, []);

  const runBenchmark = async (overrideTicker?: string) => {
    const targetTicker = (overrideTicker || ticker).trim().toUpperCase();
    setLoading(true);
    setError(null);

    try {
      const res = await backtestApi.runBenchmark({
        ticker: targetTicker,
        period,
        horizon,
      });
      setBenchmarkData(res);
      if (res.models && res.models.length > 0) {
        // Default to best model or first model
        const best = res.models.find((m) => m.is_best) || res.models[0];
        setSelectedModelId(best.model_id);
      }
    } catch (err: any) {
      console.error("Benchmark failed:", err);
      setError(err?.response?.data?.detail || "Failed to execute model benchmark. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const selectedModel: ModelMetric | undefined = useMemo(() => {
    if (!benchmarkData) return undefined;
    return (
      benchmarkData.models.find((m) => m.model_id === selectedModelId) ||
      benchmarkData.models[0]
    );
  }, [benchmarkData, selectedModelId]);

  // Equity curves SVG coordinates calculation
  const equityPoints: MultiModelEquityPoint[] = benchmarkData?.equity_curves || [];
  const svgCurves = useMemo(() => {
    if (equityPoints.length < 2) return null;

    const width = 840;
    const height = 260;
    const padding = { top: 20, right: 30, bottom: 30, left: 50 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Collect all values to find global min & max
    const allVals: number[] = [];
    equityPoints.forEach((p) => {
      allVals.push(p.benchmark, p.gbdt, p.lstm, p.rf, p.ridge, p.ma_baseline);
    });

    const minVal = Math.min(...allVals) * 0.98;
    const maxVal = Math.max(...allVals) * 1.02;
    const range = maxVal - minVal || 1;

    const getPoints = (key: keyof MultiModelEquityPoint) => {
      return equityPoints
        .map((p, idx) => {
          const x = padding.left + (idx / (equityPoints.length - 1)) * chartW;
          const val = Number(p[key]) || 100;
          const y = padding.top + chartH - ((val - minVal) / range) * chartH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    };

    return {
      width,
      height,
      minVal,
      maxVal,
      benchPolyline: getPoints("benchmark"),
      gbdtPolyline: getPoints("gbdt"),
      lstmPolyline: getPoints("lstm"),
      rfPolyline: getPoints("rf"),
      ridgePolyline: getPoints("ridge"),
      maPolyline: getPoints("ma_baseline"),
    };
  }, [equityPoints]);

  return (
    <div className="space-y-5 select-none">
      {/* Top Configurator Bar */}
      <div className="nexus-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Ticker Input & Popular Chips */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Target Stock Symbol
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE"
              className="w-full px-3 py-2 bg-[#0B1120] border border-[#26354B] rounded text-xs font-mono font-bold text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
            />
            <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto no-scrollbar">
              {POPULAR_TICKERS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTicker(t);
                    runBenchmark(t);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    ticker === t
                      ? "bg-[#386BFF] text-white font-bold"
                      : "bg-[#162238] text-[#94A3B8] hover:text-[#F1F5FC]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Lookback Window */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Historical Training Lookback
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "6mo", label: "6 Months" },
                { id: "1y", label: "1 Year" },
                { id: "2y", label: "2 Years" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`py-2 text-center rounded text-xs font-medium transition-all ${
                    period === p.id
                      ? "bg-[#386BFF] text-white font-bold shadow-sm shadow-[#386BFF]/30"
                      : "bg-[#0B1120] border border-[#26354B] text-[#94A3B8] hover:text-[#F1F5FC]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prediction Horizon */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Target Prediction Horizon
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { h: 1, label: "T+1 (Day)" },
                { h: 3, label: "T+3 (Swing)" },
                { h: 5, label: "T+5 (Week)" },
              ].map((item) => (
                <button
                  key={item.h}
                  onClick={() => setHorizon(item.h)}
                  className={`py-2 text-center rounded text-xs font-medium transition-all ${
                    horizon === item.h
                      ? "bg-[#7657F6] text-white font-bold shadow-sm shadow-[#7657F6]/30"
                      : "bg-[#0B1120] border border-[#26354B] text-[#94A3B8] hover:text-[#F1F5FC]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Run Action Button */}
          <div>
            <button
              onClick={() => runBenchmark()}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-gradient-to-r from-[#386BFF] to-[#7657F6] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-[#386BFF]/25 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              <span>{loading ? "Benchmarking Architectures..." : "Run Multi-Model Benchmark"}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#F04452]/10 border border-[#F04452]/30 text-xs text-[#F04452] flex items-center space-x-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Top Performer Trophy Banner */}
      {benchmarkData && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#111C30] via-[#162238] to-[#1E293B] border border-[#386BFF]/40 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#386BFF]/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-lg shadow-[#F59E0B]/30 flex-shrink-0">
                <Award size={26} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/15 px-2 py-0.5 rounded border border-[#F59E0B]/30">
                    🏆 Top Quantitative Model
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {ticker} ({period.toUpperCase()} dataset)
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-base text-[#F1F5FC] mt-1">
                  {benchmarkData.best_model}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Achieved highest composite risk-adjusted performance with walk-forward validation out-of-sample.
                </p>
              </div>
            </div>

            {/* Validation Protocol Badge */}
            <div className="flex flex-col items-start md:items-end justify-center bg-[#0B1120]/60 p-3 rounded-lg border border-[#26354B]">
              <div className="flex items-center space-x-1.5 text-xs text-[#00C087] font-semibold">
                <ShieldCheck size={14} />
                <span>Zero Lookahead Bias Verified</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                {benchmarkData.sample_count} total sessions • {benchmarkData.train_samples} train (75%) • {benchmarkData.test_samples} test (25%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Algorithm Leaderboard & Comparison Table */}
      {benchmarkData && (
        <div className="nexus-card overflow-hidden">
          <div className="p-4 border-b border-[#26354B] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart2 size={18} className="text-[#386BFF]" />
              <h3 className="font-heading font-bold text-sm text-[#F1F5FC]">
                Algorithm Performance Leaderboard & Comparative Evaluation
              </h3>
            </div>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              Click any model row to inspect Confusion Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#0B1120] text-[#94A3B8] uppercase text-[10px] tracking-wider border-b border-[#26354B]">
                <tr>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-4">Architecture</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Directional Acc</th>
                  <th className="py-3 px-3 text-right">Precision</th>
                  <th className="py-3 px-3 text-right">Recall</th>
                  <th className="py-3 px-3 text-right">F1-Score</th>
                  <th className="py-3 px-3 text-right">RMSE</th>
                  <th className="py-3 px-3 text-right">Sharpe Ratio</th>
                  <th className="py-3 px-3 text-right">Max Drawdown</th>
                  <th className="py-3 px-3 text-right">Return</th>
                  <th className="py-3 px-3 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26354B]/50 font-mono text-[11px]">
                {benchmarkData.models.map((m) => {
                  const isSelected = m.model_id === selectedModelId;
                  const isPositive = m.total_return_pct >= 0;

                  return (
                    <tr
                      key={m.model_id}
                      onClick={() => setSelectedModelId(m.model_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#386BFF]/15 border-l-4 border-l-[#386BFF]"
                          : "hover:bg-[#162238]/60"
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            m.rank === 1
                              ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                              : m.rank === 2
                              ? "bg-[#94A3B8]/20 text-[#E2E8F0] border border-[#94A3B8]/40"
                              : m.rank === 3
                              ? "bg-[#D97706]/20 text-[#F97316] border border-[#D97706]/40"
                              : "text-[#64748B]"
                          }`}
                        >
                          {m.rank}
                        </span>
                      </td>

                      {/* Architecture Name */}
                      <td className="py-3 px-4 font-sans font-semibold text-[#F1F5FC]">
                        <div className="flex items-center space-x-1.5">
                          <span>{m.model_name}</span>
                          {m.is_best && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F59E0B]/20 text-[#F59E0B]">
                              BEST
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Architecture Type */}
                      <td className="py-3 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#162238] border border-[#26354B] text-[#94A3B8]">
                          {m.architecture_type}
                        </span>
                      </td>

                      {/* Directional Accuracy */}
                      <td className="py-3 px-3 text-right font-bold text-[#F1F5FC]">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            m.directional_accuracy_pct >= 55
                              ? "text-[#00C087] bg-[#00C087]/15"
                              : m.directional_accuracy_pct >= 48
                              ? "text-[#386BFF] bg-[#386BFF]/15"
                              : "text-[#F04452] bg-[#F04452]/15"
                          }`}
                        >
                          {m.directional_accuracy_pct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Precision */}
                      <td className="py-3 px-3 text-right text-[#CBD5E1]">
                        {m.precision.toFixed(3)}
                      </td>

                      {/* Recall */}
                      <td className="py-3 px-3 text-right text-[#CBD5E1]">
                        {m.recall.toFixed(3)}
                      </td>

                      {/* F1-Score */}
                      <td className="py-3 px-3 text-right font-bold text-[#A78BFA]">
                        {m.f1_score.toFixed(3)}
                      </td>

                      {/* RMSE */}
                      <td className="py-3 px-3 text-right text-[#94A3B8]">
                        {m.rmse_pct.toFixed(2)}%
                      </td>

                      {/* Sharpe Ratio */}
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={m.sharpe_ratio >= 1.0 ? "text-[#00C087]" : m.sharpe_ratio >= 0 ? "text-[#386BFF]" : "text-[#F04452]"}>
                          {m.sharpe_ratio.toFixed(2)}
                        </span>
                      </td>

                      {/* Max Drawdown */}
                      <td className="py-3 px-3 text-right text-[#F04452]">
                        {m.max_drawdown_pct.toFixed(1)}%
                      </td>

                      {/* Total Return */}
                      <td className={`py-3 px-3 text-right font-bold ${isPositive ? "text-[#00C087]" : "text-[#F04452]"}`}>
                        {isPositive ? "+" : ""}{m.total_return_pct.toFixed(1)}%
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-3 text-right text-[#94A3B8] font-sans">
                        <span className="flex items-center justify-end space-x-1">
                          <Zap size={11} className="text-[#386BFF]" />
                          <span>{m.latency_ms} ms</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visual Multi-Model Equity Curves Chart */}
      {svgCurves && (
        <div className="nexus-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#26354B] gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp size={18} className="text-[#00C087]" />
                <h3 className="font-heading font-bold text-sm text-[#F1F5FC]">
                  Out-Of-Sample Cumulative Equity Simulation (Normalized Base 100)
                </h3>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Simulated walk-forward portfolio returns comparing each model against the Buy & Hold benchmark over {period.toUpperCase()}.
              </p>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
                <span className="text-[#A78BFA]">GBDT</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                <span className="text-[#06B6D4]">LSTM</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00C087]" />
                <span className="text-[#00C087]">Random Forest</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#386BFF]" />
                <span className="text-[#386BFF]">Ridge</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[#F59E0B]">MA Rule</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-1 bg-[#64748B]" />
                <span className="text-[#94A3B8]">Buy & Hold</span>
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgCurves.width} ${svgCurves.height}`}
              className="w-full h-auto min-w-[700px] overflow-visible"
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = 20 + (260 - 50) * pct;
                const val = svgCurves.maxVal - pct * (svgCurves.maxVal - svgCurves.minVal);
                return (
                  <g key={idx}>
                    <line
                      x1={50}
                      y1={y}
                      x2={svgCurves.width - 30}
                      y2={y}
                      stroke="#26354B"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={42}
                      y={y + 3}
                      fill="#64748B"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {val.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Baseline 100 line */}
              <line
                x1={50}
                y1={20 + (260 - 50) * (1 - (100 - svgCurves.minVal) / (svgCurves.maxVal - svgCurves.minVal))}
                x2={svgCurves.width - 30}
                y2={20 + (260 - 50) * (1 - (100 - svgCurves.minVal) / (svgCurves.maxVal - svgCurves.minVal))}
                stroke="#386BFF"
                strokeWidth="1"
                opacity="0.3"
              />

              {/* Polylines for each model */}
              {/* Buy & Hold Benchmark */}
              <polyline
                fill="none"
                stroke="#64748B"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                points={svgCurves.benchPolyline}
              />
              {/* MA Baseline */}
              <polyline
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                points={svgCurves.maPolyline}
              />
              {/* Ridge Regression */}
              <polyline
                fill="none"
                stroke="#386BFF"
                strokeWidth="2"
                points={svgCurves.ridgePolyline}
              />
              {/* Random Forest */}
              <polyline
                fill="none"
                stroke="#00C087"
                strokeWidth="2"
                points={svgCurves.rfPolyline}
              />
              {/* LSTM */}
              <polyline
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2"
                points={svgCurves.lstmPolyline}
              />
              {/* GBDT */}
              <polyline
                fill="none"
                stroke="#A78BFA"
                strokeWidth="2.5"
                points={svgCurves.gbdtPolyline}
              />
            </svg>
          </div>
        </div>
      )}

      {/* Selected Model Diagnostics: Confusion Matrix & Feature Weights */}
      {selectedModel && benchmarkData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 6 Cols: Confusion Matrix */}
          <div className="lg:col-span-6 nexus-card p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26354B]">
              <div className="flex items-center space-x-2">
                <Cpu size={18} className="text-[#A78BFA]" />
                <h3 className="font-heading font-bold text-sm text-[#F1F5FC]">
                  Confusion Matrix ({selectedModel.model_name})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                N = {selectedModel.confusion_matrix.tp + selectedModel.confusion_matrix.fp + selectedModel.confusion_matrix.tn + selectedModel.confusion_matrix.fn} Test Days
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] my-3">
              Binary classification breakdown for next-day directional sign (Up vs Down):
            </p>

            <div className="grid grid-cols-2 gap-3 font-mono text-center">
              {/* True Positive */}
              <div className="p-3.5 rounded-lg bg-[#00C087]/15 border border-[#00C087]/40 flex flex-col justify-center">
                <span className="text-[10px] font-semibold text-[#00C087] uppercase tracking-wider font-sans">
                  True Positive (TP)
                </span>
                <span className="text-2xl font-bold text-white mt-1">
                  {selectedModel.confusion_matrix.tp}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
                  Predicted UP • Actual UP
                </span>
              </div>

              {/* False Positive */}
              <div className="p-3.5 rounded-lg bg-[#F04452]/15 border border-[#F04452]/40 flex flex-col justify-center">
                <span className="text-[10px] font-semibold text-[#F04452] uppercase tracking-wider font-sans">
                  False Positive (FP)
                </span>
                <span className="text-2xl font-bold text-white mt-1">
                  {selectedModel.confusion_matrix.fp}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
                  Predicted UP • Actual DOWN (Type I)
                </span>
              </div>

              {/* False Negative */}
              <div className="p-3.5 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex flex-col justify-center">
                <span className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-wider font-sans">
                  False Negative (FN)
                </span>
                <span className="text-2xl font-bold text-white mt-1">
                  {selectedModel.confusion_matrix.fn}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
                  Predicted DOWN • Actual UP (Type II)
                </span>
              </div>

              {/* True Negative */}
              <div className="p-3.5 rounded-lg bg-[#386BFF]/15 border border-[#386BFF]/40 flex flex-col justify-center">
                <span className="text-[10px] font-semibold text-[#386BFF] uppercase tracking-wider font-sans">
                  True Negative (TN)
                </span>
                <span className="text-2xl font-bold text-white mt-1">
                  {selectedModel.confusion_matrix.tn}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
                  Predicted DOWN • Actual DOWN
                </span>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded bg-[#0B1120] border border-[#26354B] text-xs text-[#94A3B8]">
              <span className="font-semibold text-[#F1F5FC]">Model Architecture Note: </span>
              {selectedModel.description}
            </div>
          </div>

          {/* Right 6 Cols: Feature Importance Attribution */}
          <div className="lg:col-span-6 nexus-card p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26354B]">
              <div className="flex items-center space-x-2">
                <Layers size={18} className="text-[#386BFF]" />
                <h3 className="font-heading font-bold text-sm text-[#F1F5FC]">
                  Engineered Feature Importance Attribution
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#00C087] bg-[#00C087]/15 px-2 py-0.5 rounded border border-[#00C087]/30">
                8 Factors
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] my-3">
              Standardized relative Gini/variance contribution across technical indicators:
            </p>

            <div className="space-y-2.5">
              {benchmarkData.feature_importance.map((f, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F1F5FC] font-medium flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#386BFF]" />
                      <span>{f.feature}</span>
                    </span>
                    <span className="text-[#386BFF] font-mono font-bold">
                      {f.importance_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0B1120] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#386BFF] to-[#7657F6] rounded-full"
                      style={{ width: `${f.importance_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* College Project Viva Voce Defense Guide */}
      {benchmarkData && benchmarkData.viva_defense_guide && (
        <div className="nexus-card p-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#26354B]">
            <Sparkles size={18} className="text-[#F59E0B]" />
            <div>
              <h3 className="font-heading font-bold text-sm text-[#F1F5FC]">
                Academic Defense & Viva Voce Q&A Cheat Sheet
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Key questions and academic rationales to present during external project evaluation and thesis defense.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {benchmarkData.viva_defense_guide.map((item, qIdx) => {
              const isExpanded = expandedFaq === qIdx;

              return (
                <div
                  key={qIdx}
                  className="rounded-lg bg-[#0B1120] border border-[#26354B] overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : qIdx)}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#162238]/40 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-xs text-[#F1F5FC] pr-2">
                      Q{qIdx + 1}: {item.question}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-[#94A3B8] flex-shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-[#94A3B8] flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-3.5 pt-0 border-t border-[#26354B]/40 text-xs space-y-2 bg-[#111C30]/40">
                      <p className="text-[#CBD5E1] leading-relaxed">
                        {item.answer}
                      </p>
                      <div className="p-2 rounded bg-[#162238] border border-[#386BFF]/25 text-[11px] font-mono text-[#A78BFA] flex items-center space-x-1.5">
                        <CheckCircle2 size={13} className="text-[#386BFF] flex-shrink-0" />
                        <span>{item.academic_context}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
