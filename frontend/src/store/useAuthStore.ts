import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  activeTicker: string;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "register";
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setActiveTicker: (ticker: string) => void;
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("tradepilot_token"),
  user: null,
  activeTicker: "TCS",
  isAuthModalOpen: false,
  authModalMode: "login",

  setToken: (token) => {
    if (token) {
      localStorage.setItem("tradepilot_token", token);
    } else {
      localStorage.removeItem("tradepilot_token");
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

  setActiveTicker: (activeTicker) => set({ activeTicker: activeTicker.toUpperCase() }),

  openAuthModal: (mode = "login") => set({ isAuthModalOpen: true, authModalMode: mode }),

  closeAuthModal: () => set({ isAuthModalOpen: false }),

  logout: () => {
    localStorage.removeItem("tradepilot_token");
    set({ token: null, user: null });
  },
}));

