import React, { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  Zap,
  ShieldCheck,
  Database,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { ExchangeType } from "../../types";

export const SettingsView: React.FC = () => {
  const {
    mode,
    setMode,
    theme,
    setTheme,
    exchange,
    setExchange,
    resetVirtualFunds,
  } = useAppStore();

  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetFunds = () => {
    resetVirtualFunds();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-4xl select-none">
      <div className="nexus-card p-5">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-[#26354B]">
          <Settings size={20} className="text-[#386BFF]" />
          <div>
            <h2 className="font-heading font-bold text-base text-[#F1F5FC]">
              Terminal Configuration & Preferences
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Manage trading environment, interface modes, themes, and cloud connectivity.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Experience Mode Toggle */}
          <div>
            <label className="text-xs font-semibold text-[#F1F5FC] block mb-1">
              Trading Experience Mode
            </label>
            <p className="text-xs text-[#94A3B8] mb-3">
              Switch between simplified beginner navigation or institutional pro trading depth.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setMode("beginner")}
                className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                  mode === "beginner"
                    ? "bg-[#7657F6]/15 border-[#7657F6]"
                    : "bg-[#0B1120] border-[#26354B] hover:border-[#7657F6]/50"
                }`}
              >
                <div className="flex items-center space-x-2 text-[#7657F6] font-bold text-sm mb-1">
                  <ShieldCheck size={16} />
                  <span>Beginner Mode</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Clear explanations, risk notifications, educational tooltips, and simplified 1-click order entry.
                </p>
              </div>

              <div
                onClick={() => setMode("pro")}
                className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                  mode === "pro"
                    ? "bg-[#386BFF]/15 border-[#386BFF]"
                    : "bg-[#0B1120] border-[#26354B] hover:border-[#386BFF]/50"
                }`}
              >
                <div className="flex items-center space-x-2 text-[#386BFF] font-bold text-sm mb-1">
                  <Zap size={16} />
                  <span>Professional Mode</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  5-level market depth, technical indicators (SMA, EMA, RSI, MACD), full order book, and dense workspaces.
                </p>
              </div>
            </div>
          </div>

          {/* Color Theme Selector */}
          <div className="pt-4 border-t border-[#26354B]">
            <label className="text-xs font-semibold text-[#F1F5FC] block mb-1">
              Interface Color Theme
            </label>
            <p className="text-xs text-[#94A3B8] mb-3">
              Select between institutional Midnight Slate (Dark) or High-Contrast Light theme.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                onClick={() => setTheme("dark")}
                className={`py-2 px-3 rounded-md flex items-center justify-center space-x-2 border text-xs font-semibold transition-all ${
                  theme === "dark"
                    ? "bg-[#1A2940] border-[#386BFF] text-[#F1F5FC]"
                    : "bg-[#0B1120] border-[#26354B] text-[#94A3B8]"
                }`}
              >
                <Moon size={14} className="text-[#386BFF]" />
                <span>Midnight Slate (Dark)</span>
              </button>

              <button
                onClick={() => setTheme("light")}
                className={`py-2 px-3 rounded-md flex items-center justify-center space-x-2 border text-xs font-semibold transition-all ${
                  theme === "light"
                    ? "bg-[#1A2940] border-[#386BFF] text-[#F1F5FC]"
                    : "bg-[#0B1120] border-[#26354B] text-[#94A3B8]"
                }`}
              >
                <Sun size={14} className="text-[#F5B942]" />
                <span>Studio Light</span>
              </button>
            </div>
          </div>

          {/* Default Exchange */}
          <div className="pt-4 border-t border-[#26354B]">
            <label className="text-xs font-semibold text-[#F1F5FC] block mb-1">
              Default Order Routing Exchange
            </label>
            <div className="flex items-center space-x-3 mt-2">
              {(["NSE", "BSE"] as ExchangeType[]).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExchange(ex)}
                  className={`px-4 py-1.5 rounded text-xs font-semibold border transition-all ${
                    exchange === ex
                      ? "bg-[#386BFF] text-white border-[#386BFF]"
                      : "bg-[#0B1120] text-[#94A3B8] border-[#26354B]"
                  }`}
                >
                  {ex} (India)
                </button>
              ))}
            </div>
          </div>

          {/* Cloud Database Integration Status */}
          <div className="pt-4 border-t border-[#26354B]">
            <label className="text-xs font-semibold text-[#F1F5FC] block mb-1">
              Cloud Database & Backend Services
            </label>
            <div className="p-3 rounded bg-[#0B1120] border border-[#26354B] flex items-center justify-between text-xs font-mono-numbers">
              <div className="flex items-center space-x-3">
                <Database size={18} className="text-[#00C087]" />
                <div>
                  <span className="font-bold text-[#F1F5FC] block font-sans">
                    Supabase PostgreSQL Cloud
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    Endpoint: dakfrpfbodmhrmefwsay.supabase.co • SSL Enabled
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00C087]/15 text-[#00C087] border border-[#00C087]/30">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Reset Demo Paper Trading Balance */}
          <div className="pt-4 border-t border-[#26354B]">
            <label className="text-xs font-semibold text-[#F1F5FC] block mb-1">
              Paper Trading Virtual Account
            </label>
            <p className="text-xs text-[#94A3B8] mb-3">
              Reset virtual available margin back to starting capital (₹5,00,000.00).
            </p>

            <button
              onClick={handleResetFunds}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-md bg-[#1A2940] hover:bg-[#26354B] text-[#F1F5FC] text-xs font-medium border border-[#26354B] transition-colors"
            >
              <RotateCcw size={14} />
              <span>Reset Virtual Margin to ₹5,00,000</span>
            </button>

            {resetSuccess && (
              <div className="mt-2 text-xs text-[#00C087] flex items-center space-x-1">
                <CheckCircle2 size={14} />
                <span>Virtual trading balance has been reset to ₹5,00,000.00!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
