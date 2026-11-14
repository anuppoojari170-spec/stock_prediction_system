import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CandlestickData,
  LineData,
  AreaData,
  HistogramData,
} from "lightweight-charts";
import { TrendingUp, Activity, BarChart2, Info, Sparkles, BookOpen, X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { ChartCandle, MLForecastData } from "../../types";
import { predictionApi } from "../../services/api";

type ChartStyle = "candles" | "line" | "area";
type Timeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "1D" | "1W" | "1M";

interface TradingChartProps {
  ticker: string;
}


export const TradingChart: React.FC<TradingChartProps> = ({ ticker }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { mode, theme, openOrderModal } = useAppStore();

  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("candles");
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showForecastCone, setShowForecastCone] = useState(true);
  const [candlesData, setCandlesData] = useState<ChartCandle[]>([]);
  const [mlForecast, setMlForecast] = useState<MLForecastData | null>(null);
  const [showCandleGuide, setShowCandleGuide] = useState(false);

  // Real-time market tick from WebSocket
  const liveTick = useAppStore(
    (state) => state.liveTicks[ticker.toUpperCase()],
  );


  // Fetch candles from real yfinance API; no static fallback
  useEffect(() => {
    let isMounted = true;
    const mappedPeriod =
      timeframe === "1W"
        ? "1y"
        : timeframe === "1M"
        ? "2y"
        : timeframe === "1H" || timeframe === "30m"
        ? "1mo"
        : "6mo";

    predictionApi
      .getHistory(ticker, mappedPeriod)
      .then((res) => {
        if (isMounted && res.candles && res.candles.length > 0) {
          // Strict sanitization: ensure open, high, low, close are real finite numbers
          const seenTimes = new Set<string>();
          const cleanCandles = res.candles
            .filter(
              (c) =>
                c &&
                c.time &&
                typeof c.open === "number" &&
                !isNaN(c.open) &&
                typeof c.high === "number" &&
                !isNaN(c.high) &&
                typeof c.low === "number" &&
                !isNaN(c.low) &&
                typeof c.close === "number" &&
                !isNaN(c.close) &&
                c.open > 0
            )
            .filter((c) => {
              const t = String(c.time);
              if (seenTimes.has(t)) return false;
              seenTimes.add(t);
              return true;
            })
            .sort((a, b) => (String(a.time) > String(b.time) ? 1 : -1));

          setCandlesData(cleanCandles);
        }
      })
      .catch(() => {
        // API error — keep existing candles or leave empty
      });

    // Fetch Machine Learning Multi-Horizon Forecast
    predictionApi
      .analyzeStock(ticker)
      .then((pred) => {
        if (isMounted && pred.ml_forecast) {
          setMlForecast(pred.ml_forecast);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
    // Only re-run on ticker/timeframe change, NOT on every liveTick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeframe]);

  // Initialize and update Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = theme === "dark";
    const bg = isDark ? "#0B1120" : "#FFFFFF";
    const textCol = isDark ? "#94A3B8" : "#64748B";
    const gridCol = isDark ? "#1A2940" : "#F1F5F9";
    const borderCol = isDark ? "#26354B" : "#E2E8F0";

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: textCol,
        fontFamily: "'IBM Plex Mono', 'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridCol, style: 1 },
        horzLines: { color: gridCol, style: 1 },
      },
      crosshair: {
        vertLine: { color: "#386BFF", width: 1, style: 2 },
        horzLine: { color: "#386BFF", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: borderCol,
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: borderCol,
        timeVisible: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Filter strictly valid candles to prevent lightweight-charts assertion failure
    const validCandles = (candlesData || []).filter(
      (c) =>
        c &&
        c.time &&
        typeof c.open === "number" &&
        !isNaN(c.open) &&
        typeof c.high === "number" &&
        !isNaN(c.high) &&
        typeof c.low === "number" &&
        !isNaN(c.low) &&
        typeof c.close === "number" &&
        !isNaN(c.close) &&
        c.open > 0
    );

    // Create Main Series (Candles / Line / Area)
    let series: ISeriesApi<any>;
    if (chartStyle === "candles") {
      series = chart.addCandlestickSeries({
        upColor: "#00C087",
        downColor: "#F04452",
        borderUpColor: "#00C087",
        borderDownColor: "#F04452",
        wickUpColor: "#00C087",
        wickDownColor: "#F04452",
      });
      const candleData: CandlestickData[] = validCandles
        .filter(
          (c) =>
            c &&
            c.time &&
            typeof c.open === "number" &&
            isFinite(c.open) &&
            !isNaN(c.open) &&
            typeof c.high === "number" &&
            isFinite(c.high) &&
            !isNaN(c.high) &&
            typeof c.low === "number" &&
            isFinite(c.low) &&
            !isNaN(c.low) &&
            typeof c.close === "number" &&
            isFinite(c.close) &&
            !isNaN(c.close) &&
            c.open > 0
        )
        .map((c) => ({
          time: c.time as any,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));
      if (candleData.length > 0) {
        try {
          series.setData(candleData);
        } catch (err) {
          console.warn("Error setting candlestick series data:", err);
        }
      }
    } else if (chartStyle === "line") {
      series = chart.addLineSeries({
        color: "#386BFF",
        lineWidth: 2,
      });
      const lineData: LineData[] = validCandles.map((c) => ({
        time: c.time as any,
        value: c.close,
      }));
      series.setData(lineData);
    } else {
      series = chart.addAreaSeries({
        topColor: "rgba(56, 107, 255, 0.4)",
        bottomColor: "rgba(56, 107, 255, 0.02)",
        lineColor: "#386BFF",
        lineWidth: 2,
      });
      const areaData: AreaData[] = validCandles.map((c) => ({
        time: c.time as any,
        value: c.close,
      }));
      series.setData(areaData);
    }

    mainSeriesRef.current = series;

    // Optional Volume Histogram
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: "#386BFF",
        priceFormat: { type: "volume" },
        priceScaleId: "", // Overlay
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      const volData: HistogramData[] = validCandles.map((c) => ({
        time: c.time as any,
        value: typeof c.volume === "number" && !isNaN(c.volume) ? c.volume : 1000000,
        color:
          c.close >= c.open
            ? "rgba(0, 192, 135, 0.25)"
            : "rgba(240, 68, 82, 0.25)",
      }));
      volumeSeries.setData(volData);
      volumeSeriesRef.current = volumeSeries;
    }

    // Optional Moving Average (SMA 20)
    if (showSMA && validCandles.length >= 20) {
      const smaSeries = chart.addLineSeries({
        color: "#F5B942",
        lineWidth: 2,
        title: "SMA (20)",
      });
      const smaData: LineData[] = [];
      for (let i = 19; i < validCandles.length; i++) {
        let sum = 0;
        for (let j = 0; j < 20; j++) {
          sum += validCandles[i - j].close;
        }
        smaData.push({
          time: validCandles[i].time as any,
          value: parseFloat((sum / 20).toFixed(2)),
        });
      }
      smaSeries.setData(smaData);
    }

    // Optional Exponential Moving Average (EMA 9)
    if (showEMA && validCandles.length >= 9) {
      const emaSeries = chart.addLineSeries({
        color: "#7657F6",
        lineWidth: 2,
        title: "EMA (9)",
      });
      const emaData: LineData[] = [];
      const k = 2 / (9 + 1);
      let ema = validCandles[0].close;
      for (let i = 0; i < validCandles.length; i++) {
        ema = validCandles[i].close * k + ema * (1 - k);
        if (i >= 8) {
          emaData.push({
            time: validCandles[i].time as any,
            value: parseFloat(ema.toFixed(2)),
          });
        }
      }
      emaSeries.setData(emaData);
    }

    // Optional AI Multi-Horizon Projection Cone (T+5)
    if (
      showForecastCone &&
      mlForecast?.forecast_points &&
      mlForecast.forecast_points.length >= 2
    ) {
      const seenForecastTimes = new Set<string>();
      const validPoints = mlForecast.forecast_points
        .filter(
          (pt) =>
            pt &&
            pt.date &&
            typeof pt.target === "number" &&
            !isNaN(pt.target) &&
            typeof pt.upper === "number" &&
            !isNaN(pt.upper) &&
            typeof pt.lower === "number" &&
            !isNaN(pt.lower)
        )
        .filter((pt) => {
          const t = String(pt.date);
          if (seenForecastTimes.has(t)) return false;
          seenForecastTimes.add(t);
          return true;
        })
        .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));

      if (validPoints.length >= 2) {
        const coneAreaSeries = chart.addAreaSeries({
          topColor: "rgba(56, 107, 255, 0.16)",
          bottomColor: "rgba(56, 107, 255, 0.02)",
          lineColor: "rgba(56, 107, 255, 0.4)",
          lineWidth: 1,
          lineStyle: 1,
          title: "90% Confidence Envelope",
        });

        const targetSeries = chart.addLineSeries({
          color: "#386BFF",
          lineWidth: 2,
          lineStyle: 2, // Dashed
          title: "AI Forecast Target (T+5)",
        });
        const upperSeries = chart.addLineSeries({
          color: "#00C087",
          lineWidth: 1,
          lineStyle: 1, // Dotted
          title: "90% Upper Bound",
        });
        const lowerSeries = chart.addLineSeries({
          color: "#F04452",
          lineWidth: 1,
          lineStyle: 1, // Dotted
          title: "90% Lower Bound",
        });

        coneAreaSeries.setData(
          validPoints.map((pt) => ({
            time: pt.date as any,
            value: pt.upper,
          })),
        );
        targetSeries.setData(
          validPoints.map((pt) => ({
            time: pt.date as any,
            value: pt.target,
          })),
        );
        upperSeries.setData(
          validPoints.map((pt) => ({
            time: pt.date as any,
            value: pt.upper,
          })),
        );
        lowerSeries.setData(
          validPoints.map((pt) => ({
            time: pt.date as any,
            value: pt.lower,
          })),
        );
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [
    candlesData,
    chartStyle,
    showSMA,
    showEMA,
    showVolume,
    showForecastCone,
    mlForecast,
    theme,
  ]);

  // Dynamically update the active bar on the Lightweight Chart upon each incoming sub-second tick
  useEffect(() => {
    if (!liveTick || !mainSeriesRef.current || candlesData.length === 0) return;
    const lastCandle = candlesData[candlesData.length - 1];
    if (
      !lastCandle ||
      typeof lastCandle.open !== "number" ||
      isNaN(lastCandle.open) ||
      typeof lastCandle.high !== "number" ||
      isNaN(lastCandle.high) ||
      typeof lastCandle.low !== "number" ||
      isNaN(lastCandle.low) ||
      typeof lastCandle.close !== "number" ||
      isNaN(lastCandle.close) ||
      typeof liveTick.price !== "number" ||
      isNaN(liveTick.price) ||
      liveTick.price <= 0
    ) {
      return;
    }

    // Plausibility safeguard: if live tick deviates by >25% from last candle close (e.g. bonus/split mismatch or outlier),
    // ignore it to prevent stretching the candlestick or breaking chart scale
    if (Math.abs(liveTick.price - lastCandle.close) / lastCandle.close > 0.25) {
      return;
    }

    const newHigh = Math.max(lastCandle.high, liveTick.price);
    const newLow = Math.min(lastCandle.low, liveTick.price);

    try {
      if (chartStyle === "candles") {
        if (
          typeof lastCandle.open === "number" &&
          isFinite(lastCandle.open) &&
          typeof newHigh === "number" &&
          isFinite(newHigh) &&
          typeof newLow === "number" &&
          isFinite(newLow) &&
          typeof liveTick.price === "number" &&
          isFinite(liveTick.price)
        ) {
          mainSeriesRef.current.update({
            time: lastCandle.time as any,
            open: Number(lastCandle.open),
            high: Number(newHigh),
            low: Number(newLow),
            close: Number(liveTick.price),
          });
        }
      } else {
        if (typeof liveTick.price === "number" && isFinite(liveTick.price)) {
          mainSeriesRef.current.update({
            time: lastCandle.time as any,
            value: Number(liveTick.price),
          });
        }
      }
    } catch {
      // Lightweight chart boundary catch
    }
  }, [liveTick, chartStyle, candlesData]);

  const latestCandle = candlesData[candlesData.length - 1];
  const prevCandle = candlesData[candlesData.length - 2];
  
  // Plausibility check for header price display
  const isLiveTickConsistent =
    Boolean(
      liveTick &&
      typeof liveTick.price === "number" &&
      !isNaN(liveTick.price) &&
      latestCandle &&
      typeof latestCandle.close === "number" &&
      latestCandle.close > 0 &&
      Math.abs(liveTick.price - latestCandle.close) / latestCandle.close <= 0.25
    );

  // Price priority: consistent live WebSocket tick → last real candle close → live tick → 0
  const currentPrice = isLiveTickConsistent
    ? liveTick!.price
    : latestCandle && typeof latestCandle.close === "number"
      ? latestCandle.close
      : liveTick && typeof liveTick.price === "number"
        ? liveTick.price
        : 0;
  const dayChange = liveTick && typeof liveTick.change === "number"
    ? liveTick.change
    : prevCandle && latestCandle && typeof latestCandle.close === "number" && typeof prevCandle.close === "number"
      ? latestCandle.close - prevCandle.close
      : 0;
  const dayChangePct = liveTick && typeof liveTick.change_pct === "number"
    ? liveTick.change_pct
    : prevCandle && typeof prevCandle.close === "number" && prevCandle.close > 0
      ? (dayChange / prevCandle.close) * 100
      : 0;
  const isUp = dayChange >= 0;

  return (
    <div className="nexus-card flex flex-col overflow-hidden select-none">
      {/* Chart Header Bar */}
      <div className="p-3 border-b border-[#26354B] flex flex-wrap items-center justify-between gap-3 bg-[#0D1627]/60">
        {/* Ticker Symbol & Live Price Pill */}
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-bold text-base text-[#F1F5FC]">
                {ticker}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#386BFF]/20 text-[#386BFF] uppercase">
                NSE
              </span>
              <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#00C087]/15 text-[#00C087] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C087] animate-pulse"></span>
                <span>REALTIME</span>
              </span>
              {showForecastCone &&
                mlForecast?.horizons?.[2] &&
                typeof mlForecast.horizons[2].target_price === "number" &&
                !isNaN(mlForecast.horizons[2].target_price) && (
                <span
                  className="hidden md:flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#386BFF]/15 text-[#386BFF] font-mono border border-[#386BFF]/30"
                  title="Machine Learning Expected 5-Day Projected Target"
                >
                  <Sparkles size={11} />
                  <span>
                    T+5: ₹{mlForecast.horizons[2].target_price.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#94A3B8]">
              {ticker === "RELIANCE"
                ? "Reliance Industries Ltd"
                : `${ticker} Equity`}
            </span>
          </div>

          <div className="h-6 w-px bg-[#26354B]"></div>

          <div className="flex items-baseline space-x-2 font-mono-numbers">
            <span
              key={`${ticker}-${currentPrice}`}
              className={`text-lg font-bold px-1.5 py-0.5 rounded transition-colors ${
                liveTick
                  ? liveTick.direction === "up"
                    ? "flash-up text-[#00C087]"
                    : liveTick.direction === "down"
                      ? "flash-down text-[#F04452]"
                      : "text-[#F1F5FC]"
                  : "text-[#F1F5FC]"
              }`}
            >
              ₹{currentPrice > 0 ? currentPrice.toFixed(2) : "--"}
            </span>
            <span
              className={`text-xs font-semibold ${
                isUp ? "text-[#00C087]" : "text-[#F04452]"
              }`}
            >
              {isUp ? "+" : ""}
              {dayChange.toFixed(2)} ({isUp ? "+" : ""}
              {dayChangePct.toFixed(2)}%)
            </span>
          </div>

          <div className="h-6 w-px bg-[#26354B] hidden sm:block"></div>

          {/* Quick Buy & Sell Execution Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => openOrderModal(ticker, "BUY")}
              className="px-3.5 py-1 rounded bg-[#00C087] hover:bg-[#00D998] active:scale-95 text-white text-xs font-bold font-mono tracking-wider shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
              title={`Place BUY order for ${ticker}`}
            >
              <span>BUY</span>
            </button>
            <button
              onClick={() => openOrderModal(ticker, "SELL")}
              className="px-3.5 py-1 rounded bg-[#F04452] hover:bg-[#FF5564] active:scale-95 text-white text-xs font-bold font-mono tracking-wider shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
              title={`Place SELL order for ${ticker}`}
            >
              <span>SELL</span>
            </button>
          </div>
        </div>

        {/* Timeframe Controls */}
        <div className="flex items-center space-x-1 bg-[#111C30] p-0.5 rounded-md border border-[#26354B]">
          {(
            ["1m", "5m", "15m", "30m", "1H", "1D", "1W", "1M"] as Timeframe[]
          ).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                timeframe === tf
                  ? "bg-[#386BFF] text-white"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Style & Indicators Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Style Selector */}
          <div className="flex items-center space-x-0.5 bg-[#111C30] p-0.5 rounded-md border border-[#26354B]">
            <button
              onClick={() => setChartStyle("candles")}
              className={`p-1 rounded text-xs ${
                chartStyle === "candles"
                  ? "bg-[#386BFF] text-white"
                  : "text-[#94A3B8]"
              }`}
              title="Candlestick Chart"
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={() => setChartStyle("line")}
              className={`p-1 rounded text-xs ${
                chartStyle === "line"
                  ? "bg-[#386BFF] text-white"
                  : "text-[#94A3B8]"
              }`}
              title="Line Chart"
            >
              <TrendingUp size={14} />
            </button>
            <button
              onClick={() => setChartStyle("area")}
              className={`p-1 rounded text-xs ${
                chartStyle === "area"
                  ? "bg-[#386BFF] text-white"
                  : "text-[#94A3B8]"
              }`}
              title="Area Mountain Chart"
            >
              <Activity size={14} />
            </button>
          </div>

          {/* Indicators Toggles (Pro Mode) */}
          {mode === "pro" && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowSMA(!showSMA)}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  showSMA
                    ? "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/40"
                    : "bg-[#111C30] text-[#94A3B8] border-[#26354B]"
                }`}
                title="Toggle Simple Moving Average (20)"
              >
                SMA 20
              </button>
              <button
                onClick={() => setShowEMA(!showEMA)}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  showEMA
                    ? "bg-[#7657F6]/15 text-[#7657F6] border-[#7657F6]/40"
                    : "bg-[#111C30] text-[#94A3B8] border-[#26354B]"
                }`}
                title="Toggle Exponential Moving Average (9)"
              >
                EMA 9
              </button>
              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  showVolume
                    ? "bg-[#386BFF]/15 text-[#386BFF] border-[#386BFF]/40"
                    : "bg-[#111C30] text-[#94A3B8] border-[#26354B]"
                }`}
                title="Toggle Volume Bars"
              >
                VOL
              </button>
              <button
                onClick={() => setShowForecastCone(!showForecastCone)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  showForecastCone
                    ? "bg-[#386BFF]/20 text-[#386BFF] border-[#386BFF]/40 shadow-sm"
                    : "bg-[#111C30] text-[#94A3B8] border-[#26354B]"
                }`}
                title="Toggle AI Multi-Horizon Projection Cone (T+5)"
              >
                <Sparkles
                  size={11}
                  className={
                    showForecastCone ? "text-[#386BFF]" : "text-[#94A3B8]"
                  }
                />
                <span>AI CONE</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Beginner Mode Educational Helper */}
      {mode === "beginner" && (
        <div className="px-4 py-2 bg-[#386BFF]/10 border-b border-[#386BFF]/20 flex items-center justify-between text-xs text-[#F1F5FC]">
          <div className="flex items-center space-x-2">
            <Info size={14} className="text-[#386BFF] flex-shrink-0" />
            <span>
              <strong>Beginner Guide:</strong> Green bars show price rising
              during that day; Red bars show price falling. The line at bottom
              shows trading volume.
            </span>
          </div>
          <button
            onClick={() => setShowCandleGuide(true)}
            className="text-[#386BFF] font-semibold hover:underline flex items-center space-x-1"
          >
            <BookOpen size={13} />
            <span>Learn Candlesticks</span>
          </button>
        </div>
      )}

      {/* Beginner Educational Modal: Candlesticks Primer */}
      {showCandleGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-[#26354B] bg-[#111C30] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26354B]">
              <div className="flex items-center space-x-2">
                <BookOpen size={18} className="text-[#386BFF]" />
                <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
                  Understanding Candlestick Charts
                </h3>
              </div>
              <button
                onClick={() => setShowCandleGuide(false)}
                className="p-1 rounded text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#94A3B8]">
              <div className="p-3 rounded-lg bg-[#00C087]/10 border border-[#00C087]/30">
                <div className="font-bold text-[#00C087] mb-1">
                  🟢 Bullish (Green) Candle
                </div>
                <p>
                  The stock closed <strong>higher</strong> than it opened. The bottom of the rectangular body is the Open price, and the top is the Close price.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#F04452]/10 border border-[#F04452]/30">
                <div className="font-bold text-[#F04452] mb-1">
                  🔴 Bearish (Red) Candle
                </div>
                <p>
                  The stock closed <strong>lower</strong> than it opened. The top of the rectangular body is the Open price, and the bottom is the Close price.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B1120] border border-[#26354B]">
                <div className="font-bold text-[#F1F5FC] mb-1">
                  📏 Upper & Lower Wicks (Shadows)
                </div>
                <p>
                  The thin lines extending above and below the body show the <strong>High</strong> and <strong>Low</strong> prices traded during that time period.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCandleGuide(false)}
              className="w-full py-2 rounded-lg bg-[#386BFF] hover:bg-[#4C7DFF] text-white font-semibold text-xs transition-colors shadow-md shadow-[#386BFF]/25"
            >
              Got It, Continue Trading
            </button>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="relative w-full overflow-hidden">
        <div
          ref={chartContainerRef}
          className="w-full h-[380px] md:h-[440px] relative bg-[#0B1120]"
        />
      </div>
    </div>
  );
};
