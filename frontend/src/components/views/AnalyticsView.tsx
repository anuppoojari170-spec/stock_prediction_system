import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Play,
  Target,
  Award,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { backtestApi } from "../../services/api";
import {
  BacktestRequest,
  BacktestResponse,
  StrategyType,
} from "../../types";
import { ModelBenchmarkTab } from "../analytics/ModelBenchmarkTab";

const POPULAR_TICKERS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"];

const STRATEGIES: { id: StrategyType; label: string; desc: string }[] = [
  {
    id: "AI_ENSEMBLE",
    label: "Trade AI Pilot Ensemble",
    desc: "Multi-factor consensus combining RSI, MACD, Bollinger Bands & ATR Dynamic Stops",
  },
  {
    id: "RSI_MEAN_REVERSION",
    label: "RSI Mean Reversion (14)",
    desc: "Buys oversold dips (<32) and exits on overbought momentum (>68)",
  },
  {
    id: "MACD_CROSSOVER",
    label: "MACD Momentum Trend (12/26/9)",
    desc: "Captures institutional directional trends on MACD histogram zero-line crossovers",
  },
  {
    id: "BOLLINGER_BANDS",
    label: "Bollinger Bands Rebound (20, 2.0)",
    desc: "Mean-reversion bounce play buying at lower 2-sigma band and selling at upper band",
  },
  {
    id: "EMA_CROSSOVER",
    label: "EMA Golden Cross (20/50)",
    desc: "Trend-following system entering on 20 EMA crossing above 50 EMA",
  },
];

export const AnalyticsView: React.FC = () => {
  const activeGlobalTicker = useAppStore((state) => state.activeTicker);

  // Strategy Configurator State
  const [ticker, setTicker] = useState<string>(activeGlobalTicker || "RELIANCE");
  const [strategy, setStrategy] = useState<StrategyType>("AI_ENSEMBLE");
  const [period, setPeriod] = useState<string>("1y");
  const [capital, setCapital] = useState<number>(500000);
  const slippage = 0.05;

  // Execution & Response State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestResponse | null>(null);
  const [filterTradeLog, setFilterTradeLog] = useState<"ALL" | "WINS" | "LOSSES">("ALL");

  // Sub-tab state
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<"benchmark" | "backtest">("benchmark");
  useEffect(() => {
    runBacktest();
  }, []);

  const runBacktest = async (overrideTicker?: string, overrideStrategy?: StrategyType) => {
    const targetTicker = (overrideTicker || ticker).trim().toUpperCase();
    const targetStrategy = overrideStrategy || strategy;

    setLoading(true);
    setError(null);

    try {
      const req: BacktestRequest = {
        ticker: targetTicker,
        strategy: targetStrategy,
        period,
        initial_capital: capital,
        slippage_pct: slippage,
        brokerage_per_trade: 20.0,
      };
      const res = await backtestApi.run(req);
      setBacktestData(res);
    } catch (err: any) {
      console.error("Backtest failed:", err);
      setError(err?.response?.data?.detail || "Failed to execute backtest. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const metrics = backtestData?.metrics;
  const isNetPositive = metrics ? metrics.total_return_pct >= 0 : true;

  // Filter trade log items
  const displayedTrades = useMemo(() => {
    if (!backtestData) return [];
    if (filterTradeLog === "WINS") return backtestData.trade_log.filter((t) => t.pnl > 0);
    if (filterTradeLog === "LOSSES") return backtestData.trade_log.filter((t) => t.pnl <= 0);
    return backtestData.trade_log;
  }, [backtestData, filterTradeLog]);

  // Equity curve SVG coordinates calculation
  const equityPoints = backtestData?.equity_curve || [];
  const svgMetrics = useMemo(() => {
    if (equityPoints.length < 2) return null;

    const allValues = [
      ...equityPoints.map((p) => p.strategy_value),
      ...equityPoints.map((p) => p.benchmark_value),
    ];
    const minVal = Math.min(...allValues) * 0.98;
    const maxVal = Math.max(...allValues) * 1.02;
    const range = maxVal - minVal || 1;

    const width = 800;
    const height = 240;

    const stratPoints = equityPoints.map((p, idx) => {
      const x = (idx / (equityPoints.length - 1)) * width;
      const y = height - ((p.strategy_value - minVal) / range) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const benchPoints = equityPoints.map((p, idx) => {
      const x = (idx / (equityPoints.length - 1)) * width;
      const y = height - ((p.benchmark_value - minVal) / range) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      width,
      height,
      minVal,
      maxVal,
      stratPolyline: stratPoints.join(" "),
      benchPolyline: benchPoints.join(" "),
      firstStrat: stratPoints[0],
      lastStrat: stratPoints[stratPoints.length - 1],
    };
  }, [equityPoints]);

  return (
    <div className="space-y-5 select-none">
      {/* Top Level Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#26354B] pb-0.5">
        <button
          onClick={() => setActiveAnalyticsTab("benchmark")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-heading text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeAnalyticsTab === "benchmark"
              ? "border-[#386BFF] text-[#F1F5FC] bg-[#162238]/80 shadow-sm"
              : "border-transparent text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#111C30]/50"
          }`}
        >
          <Award size={15} className={activeAnalyticsTab === "benchmark" ? "text-[#386BFF]" : "text-[#94A3B8]"} />
          <span>ML Model Benchmark & Leaderboard</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#386BFF]/20 text-[#386BFF] border border-[#386BFF]/30">
            FINAL YEAR ML
          </span>
        </button>

        <button
          onClick={() => setActiveAnalyticsTab("backtest")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-heading text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeAnalyticsTab === "backtest"
              ? "border-[#00C087] text-[#F1F5FC] bg-[#162238]/80 shadow-sm"
              : "border-transparent text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#111C30]/50"
          }`}
        >
          <Activity size={15} className={activeAnalyticsTab === "backtest" ? "text-[#00C087]" : "text-[#94A3B8]"} />
          <span>Algorithmic Strategy Backtester</span>
        </button>
      </div>

      {activeAnalyticsTab === "benchmark" ? (
        <ModelBenchmarkTab />
      ) : (
        <>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26354B]">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="text-[#386BFF]" size={20} />
            <h2 className="font-heading font-bold text-lg text-[#F1F5FC]">
              Quantitative Strategy Backtester
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#386BFF]/15 text-[#386BFF] border border-[#386BFF]/30">
              VECTOR ENGINE
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Test algorithmic models against historical NSE tick history with simulated slippage and statutory costs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => runBacktest()}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[#386BFF] hover:bg-[#4C7DFF] disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-lg shadow-[#386BFF]/25"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            <span>{loading ? "Simulating Backtest..." : "Run Backtest"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Strategy Configurator Panel */}
      <div className="nexus-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Ticker Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Stock Universe (NSE)
            </label>
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="RELIANCE"
                className="w-full px-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] font-bold focus:outline-none focus:border-[#386BFF]"
              />
            </div>
            {/* Quick Chips */}
            <div className="flex items-center space-x-1 mt-2 overflow-x-auto no-scrollbar">
              {POPULAR_TICKERS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => {
                    setTicker(sym);
                    runBacktest(sym);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    ticker === sym
                      ? "bg-[#386BFF] text-white"
                      : "bg-[#1A2940] text-[#94A3B8] hover:text-[#F1F5FC]"
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Algorithmic Strategy Selector */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Algorithmic Trading Strategy
            </label>
            <div className="relative">
              <select
                value={strategy}
                onChange={(e) => {
                  const s = e.target.value as StrategyType;
                  setStrategy(s);
                  runBacktest(undefined, s);
                }}
                className="w-full px-3 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] font-medium appearance-none focus:outline-none focus:border-[#386BFF] pr-8"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-2.5 text-[#94A3B8] pointer-events-none"
              />
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1.5">
              {STRATEGIES.find((s) => s.id === strategy)?.desc}
            </p>
          </div>

          {/* Horizon & Capital */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                Lookback
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              >
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                Initial Capital
              </label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                step={50000}
                className="w-full px-2 py-1.5 bg-[#0B1120] border border-[#26354B] rounded text-xs font-mono-numbers text-[#F1F5FC] focus:outline-none focus:border-[#386BFF]"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#F04452]/10 border border-[#F04452]/30 rounded text-xs text-[#F04452] flex items-center space-x-2">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Performance KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="nexus-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">Strategy Net Return</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  metrics.alpha_pct >= 0 ? "bg-[#00C087]/15 text-[#00C087]" : "bg-[#F04452]/15 text-[#F04452]"
                }`}
              >
                Alpha: {metrics.alpha_pct >= 0 ? "+" : ""}{metrics.alpha_pct}%
              </span>
            </div>
            <div
              className={`text-2xl font-bold font-mono-numbers mt-1 ${
                isNetPositive ? "text-[#00C087]" : "text-[#F04452]"
              }`}
            >
              {isNetPositive ? "+" : ""}{metrics.total_return_pct}%
            </div>
            <span className="text-[11px] text-[#94A3B8] mt-1 block">
              Net P&L: ₹{metrics.net_profit.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">Win Rate</span>
              <Target size={16} className="text-[#00C087]" />
            </div>
            <div className="text-2xl font-bold font-mono-numbers text-[#00C087] mt-1">
              {metrics.win_rate_pct}%
            </div>
            <span className="text-[11px] text-[#94A3B8] mt-1 block">
              {metrics.winning_trades} Wins / {metrics.losing_trades} Losses ({metrics.total_trades} Total)
            </span>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">Profit Factor</span>
              <Award size={16} className="text-[#386BFF]" />
            </div>
            <div className="text-2xl font-bold font-mono-numbers text-[#386BFF] mt-1">
              {metrics.profit_factor}
            </div>
            <span className="text-[11px] text-[#94A3B8] mt-1 block">
              Gross Profit / Gross Loss Ratio
            </span>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">Max Drawdown (MDD)</span>
              <ShieldAlert size={16} className="text-[#F04452]" />
            </div>
            <div className="text-2xl font-bold font-mono-numbers text-[#F04452] mt-1">
              {metrics.max_drawdown_pct}%
            </div>
            <span className="text-[11px] text-[#94A3B8] mt-1 block">
              Peak-to-Trough Portfolio Retracement
            </span>
          </div>
        </div>
      )}

      {/* Equity Curve Tear Sheet (Interactive SVG) */}
      <div className="nexus-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#26354B]">
          <div>
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC] flex items-center space-x-2">
              <TrendingUp size={16} className="text-[#386BFF]" />
              <span>Portfolio Equity Curve vs Benchmark (Buy & Hold)</span>
            </h3>
            <span className="text-xs text-[#94A3B8]">
              {backtestData?.strategy_name} on {backtestData?.ticker} (Lookback: {backtestData?.period})
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-[#386BFF] rounded"></span>
              <span className="text-[#F1F5FC] font-semibold">Strategy</span>
              <span className="text-[#386BFF]">
                (₹{metrics?.ending_capital.toLocaleString("en-IN")})
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-[#64748B] rounded"></span>
              <span className="text-[#94A3B8]">Buy & Hold</span>
              <span className="text-[#94A3B8]">
                ({metrics ? `${metrics.benchmark_return_pct >= 0 ? "+" : ""}${metrics.benchmark_return_pct}%` : ""})
              </span>
            </div>
          </div>
        </div>

        {/* SVG Equity Chart Container */}
        {svgMetrics ? (
          <div className="relative w-full overflow-hidden pt-2 pb-1">
            <div className="h-56 w-full">
              <svg
                viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Horizontal Guide Lines */}
                <line
                  x1="0"
                  y1={svgMetrics.height * 0.25}
                  x2={svgMetrics.width}
                  y2={svgMetrics.height * 0.25}
                  stroke="#26354B"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <line
                  x1="0"
                  y1={svgMetrics.height * 0.5}
                  x2={svgMetrics.width}
                  y2={svgMetrics.height * 0.5}
                  stroke="#26354B"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <line
                  x1="0"
                  y1={svgMetrics.height * 0.75}
                  x2={svgMetrics.width}
                  y2={svgMetrics.height * 0.75}
                  stroke="#26354B"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />

                {/* Benchmark Polyline (Grey) */}
                <polyline
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="1.8"
                  strokeDasharray="3 3"
                  points={svgMetrics.benchPolyline}
                />

                {/* Strategy Equity Polyline (Cobalt Blue) */}
                <polyline
                  fill="none"
                  stroke="#386BFF"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={svgMetrics.stratPolyline}
                />
              </svg>
            </div>

            {/* Date Range Labels */}
            <div className="flex justify-between text-[11px] text-[#94A3B8] font-mono mt-2 pt-2 border-t border-[#26354B]/50">
              <span>{equityPoints[0]?.date}</span>
              <span>{equityPoints[Math.floor(equityPoints.length / 2)]?.date}</span>
              <span>{equityPoints[equityPoints.length - 1]?.date}</span>
            </div>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-[#94A3B8]">
            Generating equity curve simulation...
          </div>
        )}
      </div>

      {/* Monthly Returns Breakdown Bar Visualization */}
      {backtestData?.monthly_returns && backtestData.monthly_returns.length > 0 && (
        <div className="nexus-card p-4">
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#26354B]">
            <div>
              <h3 className="font-heading font-bold text-sm text-[#F1F5FC] flex items-center space-x-2">
                <BarChart3 size={16} className="text-[#386BFF]" />
                <span>Monthly Returns Breakdown</span>
              </h3>
              <span className="text-xs text-[#94A3B8]">
                Realized strategy gains and losses by month
              </span>
            </div>

            <div className="font-mono-numbers text-xs font-bold text-[#00C087]">
              CAGR: {metrics?.cagr_pct}%
            </div>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 pt-4 pb-2 px-2 border-b border-[#26354B]">
            {backtestData.monthly_returns.map((m) => {
              const isPos = m.return_pct >= 0;
              const barHeight = `${Math.min(100, Math.max(8, Math.abs(m.return_pct) * 8))}%`;

              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  <span className="text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-[#F1F5FC]">
                    {isPos ? "+" : ""}{m.return_pct}%
                  </span>
                  <div
                    className={`w-full max-w-[34px] rounded-t transition-all ${
                      isPos
                        ? "bg-[#00C087] group-hover:bg-[#00d97e]"
                        : "bg-[#F04452] group-hover:bg-[#ff4d5e]"
                    }`}
                    style={{ height: barHeight }}
                  />
                  <span className="text-[10px] font-medium text-[#94A3B8] mt-2 truncate w-full text-center">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Institutional Risk Metrics & Execution Stats */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Institutional Risk Metrics */}
          <div className="nexus-card p-4">
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-3">
              Institutional Risk Metrics
            </h3>
            <div className="space-y-2.5 text-xs font-mono-numbers">
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Sharpe Ratio (Annualized RF 6.5%):</span>
                <span className={`font-bold ${metrics.sharpe_ratio >= 1.0 ? "text-[#00C087]" : "text-[#F1F5FC]"}`}>
                  {metrics.sharpe_ratio}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Sortino Ratio (Downside Risk):</span>
                <span className="font-bold text-[#F1F5FC]">{metrics.sortino_ratio}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Benchmark Return (Buy & Hold):</span>
                <span className={`font-bold ${metrics.benchmark_return_pct >= 0 ? "text-[#00C087]" : "text-[#F04452]"}`}>
                  {metrics.benchmark_return_pct >= 0 ? "+" : ""}{metrics.benchmark_return_pct}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Compound Annual Growth Rate (CAGR):</span>
                <span className="font-bold text-[#F1F5FC]">{metrics.cagr_pct}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Alpha Generation:</span>
                <span className={`font-bold ${metrics.alpha_pct >= 0 ? "text-[#00C087]" : "text-[#F04452]"}`}>
                  {metrics.alpha_pct >= 0 ? "+" : ""}{metrics.alpha_pct}%
                </span>
              </div>
            </div>
          </div>

          {/* Trade Execution Efficiency */}
          <div className="nexus-card p-4">
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC] pb-2 border-b border-[#26354B] mb-3">
              Trade Execution Efficiency
            </h3>
            <div className="space-y-2.5 text-xs font-mono-numbers">
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Average Trade Profit / Loss:</span>
                <span className={`font-bold ${metrics.avg_trade_pnl >= 0 ? "text-[#00C087]" : "text-[#F04452]"}`}>
                  {metrics.avg_trade_pnl >= 0 ? "+" : ""}₹{metrics.avg_trade_pnl.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Average Winning Trade:</span>
                <span className="font-bold text-[#00C087]">
                  +₹{metrics.avg_win.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Average Losing Trade:</span>
                <span className="font-bold text-[#F04452]">
                  -₹{metrics.avg_loss.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26354B]/30">
                <span className="text-[#94A3B8]">Realized Risk / Reward Ratio:</span>
                <span className="font-bold text-[#386BFF]">
                  1 : {metrics.risk_reward_realized}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Flat Statutory Brokerage:</span>
                <span className="font-bold text-[#94A3B8]">₹20.00 / Trade (Flat)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Trade Execution Log Table */}
      <div className="nexus-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#26354B]">
          <div className="flex items-center space-x-2">
            <Layers size={18} className="text-[#386BFF]" />
            <h3 className="font-heading font-bold text-sm text-[#F1F5FC]">
              Strategy Trade Execution Log ({displayedTrades.length})
            </h3>
          </div>

          <div className="flex items-center space-x-1 p-0.5 bg-[#0B1120] rounded border border-[#26354B] text-xs font-medium">
            {(["ALL", "WINS", "LOSSES"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterTradeLog(filter)}
                className={`px-3 py-1 rounded transition-colors ${
                  filterTradeLog === filter
                    ? "bg-[#386BFF] text-white"
                    : "text-[#94A3B8] hover:text-[#F1F5FC]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {displayedTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#26354B]/50 text-[10px] font-semibold text-[#94A3B8] uppercase">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Entry Date</th>
                  <th className="py-2 px-3">Exit Date</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3 text-right">Shares</th>
                  <th className="py-2 px-3 text-right">Entry (₹)</th>
                  <th className="py-2 px-3 text-right">Exit (₹)</th>
                  <th className="py-2 px-3 text-right">Net P&L (₹)</th>
                  <th className="py-2 px-3 text-right">Return</th>
                  <th className="py-2 px-3 text-right">Duration</th>
                  <th className="py-2 px-3 text-center">Exit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26354B]/30 font-mono-numbers">
                {displayedTrades.map((trade) => {
                  const isTradeWin = trade.pnl > 0;
                  return (
                    <tr
                      key={trade.trade_id}
                      className="hover:bg-[#1A2940]/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-[#94A3B8]">#{trade.trade_id}</td>
                      <td className="py-2.5 px-3 text-[#F1F5FC]">{trade.entry_date}</td>
                      <td className="py-2.5 px-3 text-[#F1F5FC]">{trade.exit_date}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#386BFF]/15 text-[#386BFF]">
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#F1F5FC]">{trade.shares}</td>
                      <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                        ₹{trade.entry_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#F1F5FC] font-semibold">
                        ₹{trade.exit_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={isTradeWin ? "text-[#00C087]" : "text-[#F04452]"}>
                          {isTradeWin ? "+" : ""}₹{trade.pnl.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        <span className={isTradeWin ? "text-[#00C087]" : "text-[#F04452]"}>
                          {isTradeWin ? "+" : ""}{trade.return_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#94A3B8]">
                        {trade.holding_days}d
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            trade.exit_reason === "PROFIT_TARGET"
                              ? "bg-[#00C087]/15 text-[#00C087]"
                              : trade.exit_reason === "STOP_LOSS"
                              ? "bg-[#F04452]/15 text-[#F04452]"
                              : "bg-[#386BFF]/15 text-[#386BFF]"
                          }`}
                        >
                          {trade.exit_reason.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#94A3B8]">
            No trades match the selected filter.
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
