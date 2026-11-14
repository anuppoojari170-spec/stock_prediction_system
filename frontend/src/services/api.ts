import axios from "axios";
import {
  AICommentaryResponse,
  AIChatRequest,
  AIChatResponse,
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
  BenchmarkRequest,
  BenchmarkResponse,
} from "../types";


const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

let activeRequests = 0;
type ActivityListener = (count: number) => void;
const activityListeners = new Set<ActivityListener>();

export const subscribeToApiActivity = (listener: ActivityListener) => {
  activityListeners.add(listener);
  listener(activeRequests);
  return () => {
    activityListeners.delete(listener);
  };
};

// Automatic JWT Bearer token & active request interceptors
api.interceptors.request.use((config) => {
  activeRequests++;
  activityListeners.forEach((fn) => fn(activeRequests));
  const token = localStorage.getItem("tradepilot_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    activityListeners.forEach((fn) => fn(activeRequests));
    return response;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    activityListeners.forEach((fn) => fn(activeRequests));
    return Promise.reject(error);
  }
);

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
  searchStocks: async (query: string, limit = 15) => {
    const res = await api.get<{ ticker: string; companyName: string }[]>(
      `/market/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return res.data;
  },
};


// --- Prediction & Chart Endpoints ---
export const predictionApi = {
  analyzeStock: async (ticker: string) => {
    const res = await api.post<Prediction>("/prediction/analyze", { ticker });
    return res.data;
  },
  getCommentary: async (ticker: string, mode: "beginner" | "pro" = "pro") => {
    const res = await api.post<AICommentaryResponse>("/prediction/commentary", { ticker, mode });
    return res.data;
  },
  chatAssistant: async (req: AIChatRequest) => {
    const res = await api.post<AIChatResponse>("/prediction/assistant/chat", req);
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
  depositFunds: async (amount: number) => {
    const res = await api.post<{ message: string; balance: number }>("/trading/funds/deposit", { amount });
    return res.data;
  },
  resetFunds: async () => {
    const res = await api.post<{ message: string; balance: number }>("/trading/funds/reset");
    return res.data;
  },
};

// --- Watchlist Endpoints ---
export const watchlistApi = {
  getCategories: async () => {
    const res = await api.get<{ name: string; count: number }[]>("/watchlist/categories");
    return res.data;
  },
  createCategory: async (name: string) => {
    const res = await api.post("/watchlist/categories", { name });
    return res.data;
  },
  deleteCategory: async (name: string) => {
    const res = await api.delete(`/watchlist/categories/${encodeURIComponent(name)}`);
    return res.data;
  },
  getList: async (category?: string) => {
    const url = category ? `/watchlist?category=${encodeURIComponent(category)}` : "/watchlist";
    const res = await api.get<WatchlistItem[]>(url);
    return res.data;
  },
  add: async (ticker: string, category?: string) => {
    const res = await api.post("/watchlist", { ticker, category: category || "Watchlist 1" });
    return res.data;
  },
  remove: async (ticker: string, category?: string) => {
    const url = category
      ? `/watchlist/${ticker}?category=${encodeURIComponent(category)}`
      : `/watchlist/${ticker}`;
    const res = await api.delete(url);
    return res.data;
  },
  togglePin: async (ticker: string, category?: string) => {
    const url = category
      ? `/watchlist/${ticker}/pin?category=${encodeURIComponent(category)}`
      : `/watchlist/${ticker}/pin`;
    const res = await api.post(url);
    return res.data;
  },
};

// --- Algorithmic Backtesting Endpoints ---
export const backtestApi = {
  run: async (req: BacktestRequest): Promise<BacktestResponse> => {
    const res = await api.post<BacktestResponse>("/backtest/run", req);
    return res.data;
  },
  runBenchmark: async (req: BenchmarkRequest): Promise<BenchmarkResponse> => {
    const res = await api.post<BenchmarkResponse>("/backtest/benchmark", req);
    return res.data;
  },
};

export default api;

