import React, { useEffect, useState, useRef, useCallback } from "react";
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { authApi } from "../../services/api";

// 30-minute session inactivity timeout (SEBI / Institutional Cybersecurity Standard)
const TIMEOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes warning (triggered at 28 minutes of inactivity)
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // Refresh backend token every 10 minutes while user is active

export const SessionTimeoutManager: React.FC = () => {
  const { token, user, logout, setToken } = useAuthStore();
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);

  const lastActivityRef = useRef<number>(Date.now());
  const lastSyncRef = useRef<number>(0);
  const lastRefreshRef = useRef<number>(Date.now());
  const isWarningRef = useRef<boolean>(false);

  useEffect(() => {
    isWarningRef.current = isWarningVisible;
  }, [isWarningVisible]);

  const resetActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Throttle localStorage sync to once every 2 seconds
    if (now - lastSyncRef.current > 2000) {
      lastSyncRef.current = now;
      localStorage.setItem("tradepilot_last_activity", now.toString());
    }

    if (isWarningRef.current) {
      setIsWarningVisible(false);
    }

    // Sliding session window: seamlessly extend backend JWT validity while user is active
    if (token && now - lastRefreshRef.current > TOKEN_REFRESH_INTERVAL_MS) {
      lastRefreshRef.current = now;
      authApi
        .refresh()
        .then((res) => {
          if (res?.access_token) {
            setToken(res.access_token);
          }
        })
        .catch(() => {
          // If refresh request fails, let normal timer continue
        });
    }
  }, [token, setToken]);

  useEffect(() => {
    if (!token || !user) {
      setIsWarningVisible(false);
      return;
    }

    // Initialize timestamps
    const now = Date.now();
    lastActivityRef.current = now;
    lastRefreshRef.current = now;
    localStorage.setItem("tradepilot_last_activity", now.toString());

    // Comprehensive user activity listeners (mouse move, wheel scroll, keyboard, clicks)
    const handleUserActivity = () => {
      resetActivity();
    };

    const events = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "click"];
    events.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );

    // Cross-tab synchronization
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "tradepilot_last_activity" && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
        setIsWarningVisible(false);
      } else if (e.key === "tradepilot_token" && !e.newValue) {
        // Logged out in another tab
        logout();
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // Inactivity ticker: evaluate elapsed idle time every second
    const intervalId = setInterval(() => {
      const storedLastActivity = localStorage.getItem("tradepilot_last_activity");
      let parsedActivity = 0;
      if (storedLastActivity) {
        parsedActivity = parseInt(storedLastActivity, 10);
        if (isNaN(parsedActivity) || parsedActivity <= 0 || parsedActivity > Date.now()) {
          parsedActivity = Date.now();
          localStorage.setItem("tradepilot_last_activity", parsedActivity.toString());
        }
      } else {
        parsedActivity = Date.now();
        localStorage.setItem("tradepilot_last_activity", parsedActivity.toString());
      }

      const lastActivityTime = Math.max(lastActivityRef.current, parsedActivity);
      const elapsed = Date.now() - lastActivityTime;
      const timeLeftMs = TIMEOUT_DURATION_MS - elapsed;

      if (timeLeftMs <= 0) {
        // Full 30 minutes expired with zero activity
        setIsWarningVisible(false);
        logout(
          "Your trading session timed out after 30 minutes of inactivity to protect your account."
        );
      } else if (timeLeftMs <= WARNING_THRESHOLD_MS) {
        // Under 2 minutes remaining -> show warning dialog
        setSecondsRemaining(Math.ceil(timeLeftMs / 1000));
        setIsWarningVisible(true);
      } else {
        if (isWarningRef.current) {
          setIsWarningVisible(false);
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      events.forEach((evt) =>
        window.removeEventListener(evt, handleUserActivity)
      );
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [token, user, resetActivity, logout]);

  if (!isWarningVisible || !token || !user) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111C30] border border-[#F5B942]/40 rounded-xl shadow-2xl p-6 text-[#F1F5FC] relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F5B942] via-[#FF5C5C] to-[#F5B942]" />

        <div className="flex items-start space-x-3 mb-4">
          <div className="p-2.5 rounded-lg bg-[#F5B942]/15 text-[#F5B942] shrink-0 border border-[#F5B942]/30">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Session Inactivity Warning
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              SEBI & Institutional Cybersecurity Standard
            </p>
          </div>
        </div>

        <p className="text-xs text-[#CBD5E1] leading-relaxed mb-4">
          You have been inactive for over{" "}
          <span className="text-[#F1F5FC] font-semibold">28 minutes</span>. To
          safeguard your trading orders, margin balance, and portfolio, this
          terminal session will automatically close in:
        </p>

        {/* Countdown card */}
        <div className="flex items-center justify-center p-3.5 rounded-lg bg-[#0B1120] border border-[#26354B] mb-5">
          <Clock size={20} className="text-[#F5B942] animate-pulse mr-2" />
          <span className="font-mono text-2xl font-bold text-[#F5B942] tracking-wider">
            {formattedCountdown}
          </span>
          <span className="text-[11px] text-[#94A3B8] ml-2 font-mono">
            remaining
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={resetActivity}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#386BFF] hover:bg-[#2F5BE5] text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#386BFF]/25 transition-all cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Stay Logged In</span>
          </button>

          <button
            type="button"
            onClick={() =>
              logout(
                "You have signed out of your Trade AI Pilot terminal session."
              )
            }
            className="py-2.5 px-4 rounded-lg bg-[#1A2940] hover:bg-[#26354B] text-[#94A3B8] hover:text-[#FF5C5C] text-xs font-semibold flex items-center justify-center space-x-1.5 border border-[#26354B] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
