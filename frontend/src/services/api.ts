import axios from "axios";
import {
  ChartHistoryResponse,
  Holding,
  IndexItem,
  MoversResponse,
  NewsItem,
  PortfolioSummary,
  Prediction,
  Quote,
  SentimentResponse,
  StockDetails,
  Transaction,
  User,
  WatchlistItem,
  BacktestRequest,
  BacktestResponse,
} from "../types";


const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatic JWT Bearer token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tradepilot_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Auth Endpoints ---
export const authApi = {
  register: async (data: { email: string; username: string; full_name: string; password: string }) => {
    const res = await api.post<{ access_token: string }>("/auth/register", data);
    return res.data;
  },
  login: async (data: { login: string; password: string }) => {
    const res = await api.post<{ access_token: string }>("/auth/login", data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },
};

// --- Market Endpoints ---
export const marketApi = {
  getOverview: async () => {
    const res = await api.get<IndexItem[]>("/market/overview");
    return res.data;
  },
  getMovers: async () => {
    const res = await api.get<MoversResponse>("/market/movers");
    return res.data;
  },
  getSentiment: async () => {
    const res = await api.get<SentimentResponse>("/market/sentiment");
    return res.data;
  },
  getQuote: async (ticker: string) => {
    const res = await api.get<Quote>(`/market/quote/${ticker}`);
    return res.data;
  },
  getNews: async (limit = 12) => {
    const res = await api.get<NewsItem[]>(`/market/news?limit=${limit}`);
    return res.data;
  },
  getStockDetails: async (ticker: string) => {
    const res = await api.get<StockDetails>(`/market/stock/${ticker}`);
    return res.data;
  },
};


// --- Prediction & Chart Endpoints ---
export const predictionApi = {
  analyzeStock: async (ticker: string) => {
    const res = await api.post<Prediction>("/prediction/analyze", { ticker });
    return res.data;
  },
  getHistory: async (ticker: string, period = "3mo") => {
    const res = await api.get<ChartHistoryResponse>(`/prediction/history/${ticker}?period=${period}`);
    return res.data;
  },
};

// --- Trading & Portfolio Endpoints ---
export const tradingApi = {
  buy: async (ticker: string, quantity: number) => {
    const res = await api.post("/trading/buy", { ticker, quantity });
    return res.data;
  },
  sell: async (ticker: string, quantity: number) => {
    const res = await api.post("/trading/sell", { ticker, quantity });
    return res.data;
  },
  getPortfolio: async () => {
    const res = await api.get<Holding[]>("/trading/portfolio");
    return res.data;
  },
  getSummary: async () => {
    const res = await api.get<PortfolioSummary>("/trading/summary");
    return res.data;
  },
  getTransactions: async (limit = 50) => {
    const res = await api.get<Transaction[]>(`/trading/transactions?limit=${limit}`);
    return res.data;
  },
};

// --- Watchlist Endpoints ---
export const watchlistApi = {
  getList: async () => {
    const res = await api.get<WatchlistItem[]>("/watchlist");
    return res.data;
  },
  add: async (ticker: string) => {
    const res = await api.post("/watchlist", { ticker });
    return res.data;
  },
  remove: async (ticker: string) => {
    const res = await api.delete(`/watchlist/${ticker}`);
    return res.data;
  },
  togglePin: async (ticker: string) => {
    const res = await api.post(`/watchlist/${ticker}/pin`);
    return res.data;
  },
};

// --- Algorithmic Backtesting Endpoints ---
export const backtestApi = {
  run: async (req: BacktestRequest): Promise<BacktestResponse> => {
    const res = await api.post<BacktestResponse>("/backtest/run", req);
    return res.data;
  },
};

export default api;

