import React from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Bookmark,
  Briefcase,
  Layers,
  FileText,
  BookOpen,
  Wallet,
  Newspaper,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { NavTab } from "../../types";

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "markets", label: "Markets", icon: TrendingUp },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "positions", label: "Positions", icon: Layers, badge: "2" },
  { id: "orders", label: "Orders", icon: FileText },
  { id: "orderbook", label: "Order Book", icon: BookOpen },
  { id: "funds", label: "Funds", icon: Wallet },
  { id: "news", label: "Market News", icon: Newspaper },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    toggleSidebar,
    mode,
    setMode,
  } = useAppStore();

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-[#26354B] bg-[#0D1627] select-none ${
        isSidebarCollapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#26354B]">
        <div
          onClick={() => setActiveTab("overview")}
          className="flex items-center space-x-3 cursor-pointer overflow-hidden"
        >
          {/* Cobalt Brand Logo */}
          <div className="w-9 h-9 rounded-md bg-[#386BFF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#386BFF]/25">
            <span className="font-heading font-extrabold text-white text-sm tracking-wider">
              TP
            </span>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-heading font-bold text-sm tracking-wider text-[#F1F5FC] uppercase">
                Trade AI Pilot
              </span>
              <span className="text-[10px] text-[#386BFF] font-mono tracking-wider uppercase font-semibold">
                AI Trading Terminal
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940] transition-colors focus:outline-none"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Mode Badge Indicator */}
      <div className="px-3 py-2.5 border-b border-[#26354B]/60">
        <button
          onClick={() => setMode(mode === "pro" ? "beginner" : "pro")}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
            mode === "pro"
              ? "bg-[#386BFF]/15 text-[#386BFF] border border-[#386BFF]/30"
              : "bg-[#7657F6]/15 text-[#7657F6] border border-[#7657F6]/30"
          }`}
          title="Click to toggle Beginner / Pro mode"
        >
          <div className="flex items-center space-x-2 truncate">
            {mode === "pro" ? (
              <Zap size={14} className="flex-shrink-0 text-[#386BFF]" />
            ) : (
              <ShieldCheck size={14} className="flex-shrink-0 text-[#7657F6]" />
            )}
            {!isSidebarCollapsed && (
              <span className="truncate">
                {mode === "pro" ? "Pro Mode" : "Beginner Mode"}
              </span>
            )}
          </div>
          {!isSidebarCollapsed && (
            <span className="text-[10px] opacity-75 uppercase">Switch</span>
          )}
        </button>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors group relative ${
                isActive
                  ? "bg-[#386BFF]/15 text-[#F1F5FC] border-l-2 border-[#386BFF]"
                  : "text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#111C30]"
              }`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? "text-[#386BFF]" : "text-[#94A3B8] group-hover:text-[#F1F5FC]"
                }`}
              />

              {!isSidebarCollapsed && (
                <div className="ml-3 flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#1A2940] text-[#386BFF] font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Flyout tooltip for collapsed mode */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#1A2940] text-[#F1F5FC] text-xs rounded border border-[#26354B] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Market Live Indicator */}
      <div className="p-3 border-t border-[#26354B] bg-[#0B1120]/40">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C087]"></span>
            <span className="absolute w-2.5 h-2.5 rounded-full bg-[#00C087] animate-ping opacity-75"></span>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-[#F1F5FC] truncate">
                NSE / BSE Live
              </span>
              <span className="text-[10px] text-[#94A3B8] font-mono">
                09:15 – 15:30 IST
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

