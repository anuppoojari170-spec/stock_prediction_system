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
  watchlistCategory: string;
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

// Empty watchlists container — completely driven by authenticated user's custom lists
const defaultWatchlists: Record<string, WatchlistItem[]> = {};


const initialOrders: OrderItem[] = [];

const initialPositions: PositionItem[] = [];

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
    orderPrice: 1330.00,
    triggerPrice: 1320.00,
    isConfirmModalOpen: false,

    orders: initialOrders,
    positions: initialPositions,
    virtualBalance: savedBalance,
    usedMargin: 125400,

    watchlistCategory: "Watchlist 1",
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

