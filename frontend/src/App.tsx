import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./components/layout/Sidebar";
import { TopNavbar } from "./components/layout/TopNavbar";
import { MarketTicker } from "./components/layout/MarketTicker";
import { OverviewView } from "./components/views/OverviewView";
import { MarketsView } from "./components/views/MarketsView";
import { WatchlistView } from "./components/views/WatchlistView";
import { PortfolioView } from "./components/views/PortfolioView";
import { PositionsView } from "./components/views/PositionsView";
import { OrdersView } from "./components/views/OrdersView";
import { FundsView } from "./components/views/FundsView";
import { NewsView } from "./components/views/NewsView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { SettingsView } from "./components/views/SettingsView";
import { AuthModal } from "./components/auth/AuthModal";
import { LoginPage } from "./components/auth/LoginPage";
import { useAppStore } from "./store/useAppStore";
import { useAuthStore } from "./store/useAuthStore";
import { authApi } from "./services/api";
import { useMarketStream } from "./hooks/useMarketStream";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  },
});

const DashboardContent: React.FC = () => {
  const { activeTab, isSidebarCollapsed } = useAppStore();

  // Initialize and run real-time sub-second market data stream
  useMarketStream();

  // Route to active view
  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView />;
      case "markets":
        return <MarketsView />;
      case "watchlist":
        return <WatchlistView />;
      case "portfolio":
        return <PortfolioView />;
      case "positions":
        return <PositionsView />;
      case "orders":
      case "orderbook":
        return <OrdersView />;
      case "funds":
        return <FundsView />;
      case "news":
        return <NewsView />;
      case "analytics":
        return <AnalyticsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F1F5FC] flex">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Workspace with dynamic margin offset */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "ml-[72px]" : "ml-[240px]"
        }`}
      >
        {/* Top Navbar */}
        <TopNavbar />

        {/* Live Market Indices Ticker */}
        <MarketTicker />

        {/* Main Viewport Container */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Authentication Modal (for switching or re-authenticating) */}
      <AuthModal />
    </div>
  );
};

const MainApp: React.FC = () => {
  const { token, user, setUser, setToken } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState<boolean>(Boolean(token && !user));

  useEffect(() => {
    if (token && !user) {
      setIsVerifying(true);
      authApi
        .getMe()
        .then((userData) => {
          setUser(userData);
          setIsVerifying(false);
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          setIsVerifying(false);
        });
    } else if (!token) {
      setIsVerifying(false);
    }
  }, [token, user, setUser, setToken]);

  // Loading spinner while verifying existing token
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-[#F1F5FC] select-none">
        <div className="w-10 h-10 border-4 border-[#386BFF]/25 border-t-[#386BFF] rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono text-[#94A3B8]">
          Authenticating Trade AI Pilot Session...
        </span>
      </div>
    );
  }

  // Not authenticated: render the dedicated Login / Register portal
  if (!token || !user) {
    return (
      <LoginPage
        onSuccess={() => {
          queryClient.invalidateQueries();
        }}
      />
    );
  }

  // Authenticated: render the complete trading terminal
  return <DashboardContent />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

export default App;
