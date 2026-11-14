export type AppMode = "beginner" | "pro";
export type AppTheme = "dark" | "light";
export type ExchangeType = "NSE" | "BSE";
export type NavTab =
  | "overview"
  | "markets"
  | "watchlist"
  | "portfolio"
  | "positions"
  | "orders"
  | "orderbook"
  | "funds"
  | "news"
  | "analytics"
  | "settings";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "SL" | "SL-M";
export type ProductType = "CNC" | "MIS"; // CNC = Delivery, MIS = Intraday
export type OrderValidity = "DAY" | "IOC";
export type OrderStatus = "OPEN" | "EXECUTED" | "REJECTED" | "CANCELLED" | "PENDING";

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  balance: number;
  created_at?: string;
}

export interface Quote {
  ticker: string;
  price: number;
  day_change_pct?: number;
  day_change_abs?: number;
  high?: number;
  low?: number;
  open?: number;
  prev_close?: number;
  volume?: number;
  company_name?: string;
}

export interface IndexItem {
  name: string;
  symbol?: string;
  value?: number;
  change_abs?: number;
  change_pct?: number;
  direction?: "up" | "down" | string;
  error?: string;
}

export interface MoverItem {
  ticker: string;
  company?: string;
  price: number;
  change_pct: number;
  change_abs?: number;
  volume?: string;
}

export interface MoversResponse {
  gainers: MoverItem[];
  losers: MoverItem[];
  most_active?: MoverItem[];
}

export interface SentimentResponse {
  label: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
  buy: number;
  sell: number;
  hold: number;
}

export interface RiskLevel {
  level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
}

export interface TradePlan {
  entry: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  risk_reward: string;
}

export interface IndicatorSignal {
  name: string;
  value: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  weight: string;
}

export interface MACDData {
  macd: number;
  signal: number;
  hist: number;
}

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
}

export interface HorizonForecast {
  horizon_days: number;
  label: string;
  target_price: number;
  expected_change_pct: number;
  probability_up: number;
  lower_bound: number;
  upper_bound: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface FeatureWeight {
  factor: string;
  weight_pct: number;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface ModelAccuracy {
  directional_hit_rate_pct: number;
  backtested_sessions: number;
  mape_pct: number;
}

export interface ForecastPoint {
  date: string;
  target: number;
  lower: number;
  upper: number;
  is_anchor?: boolean;
}

export interface MLForecastData {
  horizons: HorizonForecast[];
  feature_importance: FeatureWeight[];
  model_accuracy: ModelAccuracy;
  forecast_points: ForecastPoint[];
}

export interface Prediction {
  ticker: string;
  current_price: number;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  recommendation: string;
  risk: RiskLevel;
  ma5: number;
  ma20: number;
  day_change_pct: number;
  strength: number;
  rsi?: number;
  macd?: MACDData;
  bollinger?: BollingerData;
  trade_plan?: TradePlan;
  breakdown?: IndicatorSignal[];
  ml_forecast?: MLForecastData;
}

export interface MarketDepthLevel {
  bidOrders: number;
  bidQty: number;
  bidPrice: number;
  askPrice: number;
  askQty: number;
  askOrders: number;
}

export interface StockDetails {
  ticker: string;
  companyName: string;
  sector: string;
  exchange: ExchangeType;
  price: number;
  changeAbs: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  marketCap: string;
  peRatio: number;
  pbRatio: number;
  divYield: number;
  high52: number;
  low52: number;
  description: string;
}

export interface ChartCandle {
  time: string; // YYYY-MM-DD or Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartHistoryResponse {
  ticker: string;
  candles: ChartCandle[];
}

export interface Holding {
  ticker: string;
  companyName?: string;
  shares: number;
  avg_price: number;
  current_price: number;
  invested: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
  day_pnl?: number;
  day_pnl_pct?: number;
}

export interface PositionItem {
  id: string;
  ticker: string;
  product: ProductType;
  quantity: number;
  buyPrice: number;
  ltp: number;
  realizedPnl: number;
  unrealizedPnl: number;
  netPnl: number;
  status: "OPEN" | "CLOSED";
}

export interface OrderItem {
  id: string;
  ticker: string;
  exchange: ExchangeType;
  side: OrderSide;
  product: ProductType;
  orderType: OrderType;
  quantity: number;
  filledQuantity: number;
  price: number;
  triggerPrice?: number;
  status: OrderStatus;
  timestamp: string;
}

export interface PortfolioSummary {
  balance: number;
  total_invested: number;
  current_value: number;
  total_pnl: number;
  growth_pct: number;
  holdings_count: number;
  todays_pnl: number;
  transactions_count: number;
  used_margin: number;
  withdrawable_balance: number;
}

export interface Transaction {
  id: number;
  ticker: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
}

export interface WatchlistItem {
  ticker: string;
  companyName: string;
  pinned: boolean;
  price: number;
  change_abs: number;
  change_pct: number;
  volume: string;
  sparkline?: number[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  category: "Economy" | "Corporate" | "Earnings" | "Global" | "Regulation";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  summary: string;
  relatedTickers: string[];
}

export type WsConnectionStatus = "connected" | "connecting" | "disconnected";

export interface TickerTick {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  change_pct: number;
  volume: number;
  bid: number;
  ask: number;
  direction: "up" | "down" | "flat";
  timestamp: number;
}

export interface IndexTick {
  name: string;
  value: number;
  change: number;
  change_pct: number;
  direction: "up" | "down";
  timestamp: number;
}

export interface DepthOrderLevel {
  price: number;
  qty: number;
  orders: number;
}

export interface LiveDepthData {
  ticker: string;
  bids: DepthOrderLevel[];
  asks: DepthOrderLevel[];
}

export type StrategyType =
  | "AI_ENSEMBLE"
  | "RSI_MEAN_REVERSION"
  | "MACD_CROSSOVER"
  | "BOLLINGER_BANDS"
  | "EMA_CROSSOVER";

export interface BacktestRequest {
  ticker: string;
  strategy: StrategyType;
  period: string;
  initial_capital?: number;
  slippage_pct?: number;
  brokerage_per_trade?: number;
}

export interface TradeLogItem {
  trade_id: number;
  entry_date: string;
  exit_date: string;
  side: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  return_pct: number;
  holding_days: number;
  exit_reason: string;
}

export interface EquityPoint {
  date: string;
  strategy_value: number;
  benchmark_value: number;
  drawdown_pct: number;
}

export interface BacktestMetrics {
  initial_capital: number;
  ending_capital: number;
  net_profit: number;
  total_return_pct: number;
  benchmark_return_pct: number;
  alpha_pct: number;
  cagr_pct: number;
  win_rate_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  profit_factor: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  avg_trade_pnl: number;
  avg_win: number;
  avg_loss: number;
  risk_reward_realized: number;
}

export interface MonthlyReturn {
  month: string;
  return_pct: number;
}

export interface BacktestResponse {
  ticker: string;
  strategy_name: string;
  period: string;
  metrics: BacktestMetrics;
  equity_curve: EquityPoint[];
  trade_log: TradeLogItem[];
  monthly_returns: MonthlyReturn[];
}


