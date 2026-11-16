import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  activeTicker: string;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "register";
  sessionExpiredReason: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setActiveTicker: (ticker: string) => void;
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  setSessionExpiredReason: (reason: string | null) => void;
  logout: (reason?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("tradepilot_token"),
  user: null,
  activeTicker: "TCS",
  isAuthModalOpen: false,
  authModalMode: "login",
  sessionExpiredReason: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem("tradepilot_token", token);
      localStorage.setItem("tradepilot_last_activity", Date.now().toString());
    } else {
      localStorage.removeItem("tradepilot_token");
      localStorage.removeItem("tradepilot_last_activity");
    }
    set({ token, sessionExpiredReason: null });
  },

  setUser: (user) => set({ user }),

  setActiveTicker: (activeTicker) => set({ activeTicker: activeTicker.toUpperCase() }),

  openAuthModal: (mode = "login") => set({ isAuthModalOpen: true, authModalMode: mode }),

  closeAuthModal: () => set({ isAuthModalOpen: false }),

  setSessionExpiredReason: (reason) => set({ sessionExpiredReason: reason }),

  logout: (reason?: string) => {
    localStorage.removeItem("tradepilot_token");
    localStorage.removeItem("tradepilot_last_activity");
    set({
      token: null,
      user: null,
      sessionExpiredReason: reason || null,
    });
  },
}));

