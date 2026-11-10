import { create } from "zustand";
import {
  AppMode,
  AppTheme,
  ExchangeType,
  IndexTick,
  LiveDepthData,
  NavTab,
  OrderItem,
  OrderSide,
  OrderStatus,
  OrderType,
  PositionItem,
  ProductType,
  TickerTick,
  WatchlistItem,
  WsConnectionStatus,
} from "../types";

interface AppState {
  // Appearance & navigation
  mode: AppMode;
  theme: AppTheme;
  activeTab: NavTab;
  isSidebarCollapsed: boolean;
  exchange: ExchangeType;
  activeTicker: string;
  searchQuery: string;

  // Trading execution state
  orderSide: OrderSide;
  orderType: OrderType;
  productType: ProductType;
  orderQty: number;
  orderPrice: number;
  triggerPrice: number;
  isConfirmModalOpen: boolean;

  // Local simulated ledger (complements backend)
  orders: OrderItem[];
  positions: PositionItem[];
  virtualBalance: number;
  usedMargin: number;

  // Custom watchlists
  watchlistCategory: "NIFTY 50" | "Banking" | "IT" | "My Watchlist";
  watchlists: Record<string, WatchlistItem[]>;

  // Real-time market streaming state
  wsStatus: WsConnectionStatus;
  liveTicks: Record<string, TickerTick>;
  liveIndices: Record<string, IndexTick>;
  liveDepth: Record<string, LiveDepthData>;
  lastTickTimestamp: number;

  // Actions
  setWsStatus: (status: WsConnectionStatus) => void;
  applySnapshot: (snapshot: { stocks?: TickerTick[]; indices?: IndexTick[] }) => void;
  applyTick: (tick: TickerTick) => void;
  applyIndexTick: (indexTick: IndexTick) => void;
  applyDepth: (depth: LiveDepthData) => void;

  setMode: (mode: AppMode) => void;
  setTheme: (theme: AppTheme) => void;
  setActiveTab: (tab: NavTab) => void;
  toggleSidebar: () => void;
  setExchange: (exchange: ExchangeType) => void;
  setActiveTicker: (ticker: string) => void;
  setSearchQuery: (query: string) => void;

  setOrderSide: (side: OrderSide) => void;
  setOrderType: (type: OrderType) => void;
  setProductType: (product: ProductType) => void;
  setOrderQty: (qty: number) => void;
  setOrderPrice: (price: number) => void;
  setTriggerPrice: (price: number) => void;
  setIsConfirmModalOpen: (open: boolean) => void;

  submitOrder: (order: Omit<OrderItem, "id" | "timestamp" | "status" | "filledQuantity">) => { success: boolean; message: string; orderId?: string };
  cancelOrder: (orderId: string) => void;
  squareOffPosition: (positionId: string) => void;
  depositFunds: (amount: number) => void;
  withdrawFunds: (amount: number) => boolean;
  resetVirtualFunds: () => void;
  toggleWatchlistPin: (ticker: string) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (ticker: string) => void;
}

// Initial Indian Stock Market Watchlists
const defaultWatchlists: Record<string, WatchlistItem[]> = {
  "NIFTY 50": [
    { ticker: "RELIANCE", companyName: "Reliance Industries Ltd", pinned: true, price: 2984.50, change_abs: 38.20, change_pct: 1.30, volume: "6.8M", sparkline: [2945, 2960, 2952, 2975, 2984.5] },
    { ticker: "TCS", companyName: "Tata Consultancy Services", pinned: true, price: 4120.75, change_abs: 45.30, change_pct: 1.11, volume: "2.1M", sparkline: [4070, 4085, 4100, 4095, 4120.7] },
    { ticker: "HDFCBANK", companyName: "HDFC Bank Limited", pinned: true, price: 1742.30, change_abs: -8.40, change_pct: -0.48, volume: "12.4M", sparkline: [1755, 1752, 1748, 1740, 1742.3] },
    { ticker: "INFY", companyName: "Infosys Limited", pinned: false, price: 1865.10, change_abs: 22.80, change_pct: 1.24, volume: "5.4M", sparkline: [1840, 1845, 1855, 1860, 1865.1] },
    { ticker: "ICICIBANK", companyName: "ICICI Bank Limited", pinned: false, price: 1268.90, change_abs: 14.50, change_pct: 1.16, volume: "8.9M", sparkline: [1252, 1258, 1262, 1265, 1268.9] },
    { ticker: "BHARTIARTL", companyName: "Bharti Airtel Limited", pinned: false, price: 1595.60, change_abs: 6.20, change_pct: 0.39, volume: "3.7M", sparkline: [1588, 1590, 1592, 1598, 1595.6] },
    { ticker: "SBIN", companyName: "State Bank of India", pinned: false, price: 818.40, change_abs: -4.10, change_pct: -0.50, volume: "9.2M", sparkline: [824, 822, 820, 816, 818.4] },
    { ticker: "ITC", companyName: "ITC Limited", pinned: false, price: 476.85, change_abs: 1.95, change_pct: 0.41, volume: "7.1M", sparkline: [474, 475, 476, 477, 476.85] },
  ],
  "Banking": [
    { ticker: "HDFCBANK", companyName: "HDFC Bank Limited", pinned: true, price: 1742.30, change_abs: -8.40, change_pct: -0.48, volume: "12.4M", sparkline: [1755, 1752, 1748, 1740, 1742.3] },
    { ticker: "ICICIBANK", companyName: "ICICI Bank Limited", pinned: true, price: 1268.90, change_abs: 14.50, change_pct: 1.16, volume: "8.9M", sparkline: [1252, 1258, 1262, 1265, 1268.9] },
    { ticker: "SBIN", companyName: "State Bank of India", pinned: true, price: 818.40, change_abs: -4.10, change_pct: -0.50, volume: "9.2M", sparkline: [824, 822, 820, 816, 818.4] },
    { ticker: "KOTAKBANK", companyName: "Kotak Mahindra Bank", pinned: false, price: 1785.20, change_abs: 5.60, change_pct: 0.31, volume: "3.1M", sparkline: [1778, 1780, 1782, 1788, 1785.2] },
    { ticker: "AXISBANK", companyName: "Axis Bank Limited", pinned: false, price: 1195.40, change_abs: -7.80, change_pct: -0.65, volume: "4.5M", sparkline: [1205, 1202, 1198, 1193, 1195.4] },
  ],
  "IT": [
    { ticker: "TCS", companyName: "Tata Consultancy Services", pinned: true, price: 4120.75, change_abs: 45.30, change_pct: 1.11, volume: "2.1M", sparkline: [4070, 4085, 4100, 4095, 4120.7] },
    { ticker: "INFY", companyName: "Infosys Limited", pinned: true, price: 1865.10, change_abs: 22.80, change_pct: 1.24, volume: "5.4M", sparkline: [1840, 1845, 1855, 1860, 1865.1] },
    { ticker: "HCLTECH", companyName: "HCL Technologies Ltd", pinned: false, price: 1824.60, change_abs: 18.40, change_pct: 1.02, volume: "2.8M", sparkline: [1805, 1810, 1818, 1822, 1824.6] },
    { ticker: "WIPRO", companyName: "Wipro Limited", pinned: false, price: 564.30, change_abs: -2.10, change_pct: -0.37, volume: "4.1M", sparkline: [568, 567, 566, 563, 564.3] },
  ],
  "My Watchlist": [
    { ticker: "RELIANCE", companyName: "Reliance Industries Ltd", pinned: true, price: 2984.50, change_abs: 38.20, change_pct: 1.30, volume: "6.8M", sparkline: [2945, 2960, 2952, 2975, 2984.5] },
    { ticker: "TATAMOTORS", companyName: "Tata Motors Limited", pinned: true, price: 988.40, change_abs: 12.60, change_pct: 1.29, volume: "7.8M", sparkline: [974, 978, 982, 986, 988.4] },
    { ticker: "LTIM", companyName: "LTIMindtree Limited", pinned: false, price: 5940.00, change_abs: 85.00, change_pct: 1.45, volume: "850K", sparkline: [5840, 5870, 5910, 5925, 5940] },
  ],
};

const initialOrders: OrderItem[] = [
  {
    id: "ORD-89410",
    ticker: "RELIANCE",
    exchange: "NSE",
    side: "BUY",
    product: "CNC",
    orderType: "MARKET",
    quantity: 25,
    filledQuantity: 25,
    price: 2975.00,
    status: "EXECUTED",
    timestamp: "Today, 10:42 AM",
  },
  {
    id: "ORD-89408",
    ticker: "TCS",
    exchange: "NSE",
    side: "BUY",
    product: "CNC",
    orderType: "LIMIT",
    quantity: 15,
    filledQuantity: 15,
    price: 4095.00,
    status: "EXECUTED",
    timestamp: "Today, 09:35 AM",
  },
  {
    id: "ORD-89401",
    ticker: "INFY",
    exchange: "NSE",
    side: "BUY",
    product: "MIS",
    orderType: "LIMIT",
    quantity: 50,
    filledQuantity: 0,
    price: 1850.00,
    status: "OPEN",
    timestamp: "Today, 09:18 AM",
  },
];

const initialPositions: PositionItem[] = [
  {
    id: "POS-101",
    ticker: "INFY",
    product: "MIS",
    quantity: 50,
    buyPrice: 1852.00,
    ltp: 1865.10,
    realizedPnl: 0,
    unrealizedPnl: 655.00,
    netPnl: 655.00,
    status: "OPEN",
  },
  {
    id: "POS-102",
    ticker: "SBIN",
    product: "MIS",
    quantity: 100,
    buyPrice: 822.50,
    ltp: 818.40,
    realizedPnl: 0,
    unrealizedPnl: -410.00,
    netPnl: -410.00,
    status: "OPEN",
  },
];

export const useAppStore = create<AppState>((set, get) => {
  // Read persisted preferences
  const savedMode = (localStorage.getItem("nexus_mode") as AppMode) || "pro";
  const savedTheme = (localStorage.getItem("nexus_theme") as AppTheme) || "dark";
  const savedBalance = Number(localStorage.getItem("nexus_virtual_balance")) || 500000;

  // Apply theme class to document
  if (typeof document !== "undefined") {
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }

  return {
    mode: savedMode,
    theme: savedTheme,
    activeTab: "overview",
    isSidebarCollapsed: false,
    exchange: "NSE",
    activeTicker: "RELIANCE",
    searchQuery: "",

    orderSide: "BUY",
    orderType: "MARKET",
    productType: "CNC",
    orderQty: 10,
    orderPrice: 2984.50,
    triggerPrice: 2950.00,
    isConfirmModalOpen: false,

    orders: initialOrders,
    positions: initialPositions,
    virtualBalance: savedBalance,
    usedMargin: 125400,

    watchlistCategory: "NIFTY 50",
    watchlists: defaultWatchlists,

    // Real-time market streaming state
    wsStatus: "disconnected",
    liveTicks: {},
    liveIndices: {},
    liveDepth: {},
    lastTickTimestamp: Date.now(),

    setWsStatus: (wsStatus) => set({ wsStatus }),

    applySnapshot: (snapshot) => {
      set((state) => {
        const nextTicks = { ...state.liveTicks };
        const nextIndices = { ...state.liveIndices };

        if (snapshot.stocks) {
          for (const s of snapshot.stocks) {
            nextTicks[s.ticker.toUpperCase()] = s;
          }
        }
        if (snapshot.indices) {
          for (const idx of snapshot.indices) {
            nextIndices[idx.name] = idx;
          }
        }

        return {
          liveTicks: nextTicks,
          liveIndices: nextIndices,
          lastTickTimestamp: Date.now(),
        };
      });
    },

    applyTick: (tick) => {
      set((state) => {
        const sym = tick.ticker.toUpperCase();
        const nextTicks = { ...state.liveTicks, [sym]: tick };

        // 1. Live Mark-to-Market (MTM) calculations for open positions
        let positionsChanged = false;
        const updatedPositions = state.positions.map((pos) => {
          if (pos.ticker.toUpperCase() === sym && pos.status === "OPEN") {
            positionsChanged = true;
            const ltp = tick.price;
            const unrealizedPnl = Math.round((ltp - pos.buyPrice) * pos.quantity * 100) / 100;
            const netPnl = Math.round((pos.realizedPnl + unrealizedPnl) * 100) / 100;
            return {
              ...pos,
              ltp,
              unrealizedPnl,
              netPnl,
            };
          }
          return pos;
        });

        // 2. Dynamically update watchlist prices & sparklines
        const updatedWatchlists = { ...state.watchlists };
        let watchlistChanged = false;
        for (const cat of Object.keys(updatedWatchlists)) {
          updatedWatchlists[cat] = updatedWatchlists[cat].map((item) => {
            if (item.ticker.toUpperCase() === sym) {
              watchlistChanged = true;
              const sparkline = item.sparkline
                ? [...item.sparkline.slice(-14), tick.price]
                : [tick.price];
              return {
                ...item,
                price: tick.price,
                change_abs: tick.change,
                change_pct: tick.change_pct,
                sparkline,
              };
            }
            return item;
          });
        }

        // 3. Keep market order price in sync with active ticker LTP
        const shouldSyncOrderPrice =
          state.activeTicker.toUpperCase() === sym && state.orderType === "MARKET";

        return {
          liveTicks: nextTicks,
          positions: positionsChanged ? updatedPositions : state.positions,
          watchlists: watchlistChanged ? updatedWatchlists : state.watchlists,
          orderPrice: shouldSyncOrderPrice ? tick.price : state.orderPrice,
          lastTickTimestamp: Date.now(),
        };
      });
    },

    applyIndexTick: (indexTick) => {
      set((state) => ({
        liveIndices: {
          ...state.liveIndices,
          [indexTick.name]: indexTick,
        },
        lastTickTimestamp: Date.now(),
      }));
    },

    applyDepth: (depth) => {
      set((state) => ({
        liveDepth: {
          ...state.liveDepth,
          [depth.ticker.toUpperCase()]: depth,
        },
      }));
    },

    setMode: (mode) => {
      localStorage.setItem("nexus_mode", mode);
      set({ mode });
    },

    setTheme: (theme) => {
      localStorage.setItem("nexus_theme", theme);
      if (typeof document !== "undefined") {
        if (theme === "light") {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        } else {
          document.documentElement.classList.remove("light");
          document.documentElement.classList.add("dark");
        }
      }
      set({ theme });
    },

    setActiveTab: (activeTab) => set({ activeTab }),

    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

    setExchange: (exchange) => set({ exchange }),

    setActiveTicker: (ticker) => set({ activeTicker: ticker.toUpperCase() }),

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    setOrderSide: (orderSide) => set({ orderSide }),
    setOrderType: (orderType) => set({ orderType }),
    setProductType: (productType) => set({ productType }),
    setOrderQty: (orderQty) => set({ orderQty }),
    setOrderPrice: (orderPrice) => set({ orderPrice }),
    setTriggerPrice: (triggerPrice) => set({ triggerPrice }),
    setIsConfirmModalOpen: (isConfirmModalOpen) => set({ isConfirmModalOpen }),

    submitOrder: (orderData) => {
      const state = get();
      const totalCost = orderData.quantity * orderData.price;

      if (orderData.side === "BUY" && totalCost > state.virtualBalance) {
        return { success: false, message: "Insufficient available margin to place this order." };
      }

      const newOrderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      const status: OrderStatus = orderData.orderType === "MARKET" ? "EXECUTED" : "OPEN";
      const filledQuantity = status === "EXECUTED" ? orderData.quantity : 0;

      const newOrder: OrderItem = {
        ...orderData,
        id: newOrderId,
        status,
        filledQuantity,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      let newBalance = state.virtualBalance;
      let newUsedMargin = state.usedMargin;

      if (status === "EXECUTED") {
        if (orderData.side === "BUY") {
          newBalance -= totalCost;
          newUsedMargin += orderData.product === "MIS" ? totalCost * 0.2 : totalCost;
        } else {
          newBalance += totalCost;
        }
      }

      // If MIS (Intraday), record as open position
      let newPositions = [...state.positions];
      if (orderData.product === "MIS" && status === "EXECUTED") {
        newPositions.unshift({
          id: `POS-${Math.floor(100 + Math.random() * 900)}`,
          ticker: orderData.ticker,
          product: "MIS",
          quantity: orderData.quantity,
          buyPrice: orderData.price,
          ltp: orderData.price,
          realizedPnl: 0,
          unrealizedPnl: 0,
          netPnl: 0,
          status: "OPEN",
        });
      }

      localStorage.setItem("nexus_virtual_balance", newBalance.toString());

      set({
        orders: [newOrder, ...state.orders],
        positions: newPositions,
        virtualBalance: newBalance,
        usedMargin: newUsedMargin,
      });

      return { success: true, message: `Order #${newOrderId} submitted successfully!`, orderId: newOrderId };
    },

    cancelOrder: (orderId) => {
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, status: "CANCELLED" as OrderStatus } : o
        ),
      }));
    },

    squareOffPosition: (positionId) => {
      set((state) => {
        const target = state.positions.find((p) => p.id === positionId);
        if (!target) return state;

        const pnl = (target.ltp - target.buyPrice) * target.quantity;
        const newBalance = state.virtualBalance + (target.buyPrice * target.quantity) + pnl;
        localStorage.setItem("nexus_virtual_balance", newBalance.toString());

        return {
          virtualBalance: newBalance,
          positions: state.positions.map((p) =>
            p.id === positionId
              ? { ...p, status: "CLOSED", realizedPnl: pnl, unrealizedPnl: 0, netPnl: pnl }
              : p
          ),
        };
      });
    },

    depositFunds: (amount) => {
      set((state) => {
        const newBal = state.virtualBalance + amount;
        localStorage.setItem("nexus_virtual_balance", newBal.toString());
        return { virtualBalance: newBal };
      });
    },

    withdrawFunds: (amount) => {
      const state = get();
      if (amount > state.virtualBalance) return false;
      const newBal = state.virtualBalance - amount;
      localStorage.setItem("nexus_virtual_balance", newBal.toString());
      set({ virtualBalance: newBal });
      return true;
    },

    resetVirtualFunds: () => {
      localStorage.setItem("nexus_virtual_balance", "500000");
      set({ virtualBalance: 500000, usedMargin: 0 });
    },

    toggleWatchlistPin: (ticker) => {
      set((state) => {
        const updated = { ...state.watchlists };
        for (const cat of Object.keys(updated)) {
          updated[cat] = updated[cat].map((item) =>
            item.ticker === ticker ? { ...item, pinned: !item.pinned } : item
          );
        }
        return { watchlists: updated };
      });
    },

    addToWatchlist: (item) => {
      set((state) => {
        const currentList = state.watchlists[state.watchlistCategory] || [];
        if (currentList.some((x) => x.ticker === item.ticker)) return state;
        return {
          watchlists: {
            ...state.watchlists,
            [state.watchlistCategory]: [item, ...currentList],
          },
        };
      });
    },

    removeFromWatchlist: (ticker) => {
      set((state) => {
        return {
          watchlists: {
            ...state.watchlists,
            [state.watchlistCategory]: (state.watchlists[state.watchlistCategory] || []).filter(
              (x) => x.ticker !== ticker
            ),
          },
        };
      });
    },
  };
});

