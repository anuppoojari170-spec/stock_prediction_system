import React, { useState } from "react";
import { X, Lock, Mail, User as UserIcon, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { authApi } from "../../services/api";
import { CirclingLoader } from "../common/CirclingLoader";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, setToken, setUser } =
    useAuthStore();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authModalMode === "register") {
        const tokenRes = await authApi.register({
          email,
          username,
          full_name: fullName,
          password,
        });
        setToken(tokenRes.access_token);
      } else {
        const tokenRes = await authApi.login({
          login: email || username,
          password,
        });
        setToken(tokenRes.access_token);
      }

      // Fetch user profile
      const userRes = await authApi.getMe();
      setUser(userRes);
      closeAuthModal();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl border border-[#26354B] bg-[#111C30] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-md p-1.5 text-[#94A3B8] hover:bg-[#1A2940] hover:text-[#F1F5FC] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title & Brand Emblem */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#386BFF] text-white font-extrabold text-sm shadow-lg shadow-[#386BFF]/30 font-heading tracking-wider">
            TP
          </div>
          <h2 className="text-xl font-bold font-heading text-[#F1F5FC]">
            {authModalMode === "login" ? "Sign In to Trade AI Pilot" : "Create Trade AI Pilot Account"}
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            {authModalMode === "login"
              ? "Access your live NSE/BSE trading terminal and portfolio."
              : "Sign up and receive ₹10,00,000 in virtual paper trading margin."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-[#F04452]/30 bg-[#F04452]/10 p-3 text-xs text-[#F04452]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Anup Poojari"
                    className="w-full rounded-md border border-[#26354B] bg-[#0B1120] pl-10 pr-3 py-2 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="anuppoojari"
                    className="w-full rounded-md border border-[#26354B] bg-[#0B1120] pl-10 pr-3 py-2 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
              {authModalMode === "login" ? "Email or Username" : "Email Address"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <input
                type={authModalMode === "login" ? "text" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={authModalMode === "login" ? "user@example.com or username" : "user@example.com"}
                className="w-full rounded-md border border-[#26354B] bg-[#0B1120] pl-10 pr-3 py-2 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-[#26354B] bg-[#0B1120] pl-10 pr-3 py-2 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-md bg-[#386BFF] py-2.5 text-xs font-semibold text-white hover:bg-[#4C7DFF] focus:outline-none disabled:opacity-50 transition shadow-lg shadow-[#386BFF]/25 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <CirclingLoader size="xs" color="text-white" />
                <span>Processing...</span>
              </>
            ) : authModalMode === "login" ? (
              "Sign In to Terminal"
            ) : (
              "Create Account & Start Trading"
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center text-xs text-[#94A3B8]">
          {authModalMode === "login" ? (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="font-semibold text-[#386BFF] hover:underline"
              >
                Sign up free
              </button>
            </span>
          ) : (
            <span>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="font-semibold text-[#386BFF] hover:underline"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
