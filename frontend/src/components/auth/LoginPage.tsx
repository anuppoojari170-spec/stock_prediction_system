import React, { useState } from "react";
import {
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  Shield,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { CirclingLoader } from "../common/CirclingLoader";
import { authApi } from "../../services/api";

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { setToken, setUser, sessionExpiredReason, setSessionExpiredReason } = useAuthStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const tokenRes = await authApi.register({
          email: email.trim(),
          username: username.trim(),
          full_name: fullName.trim(),
          password,
        });
        setToken(tokenRes.access_token);
      } else {
        const tokenRes = await authApi.login({
          login: loginInput.trim(),
          password,
        });
        setToken(tokenRes.access_token);
      }

      // Fetch user profile and starting balance
      const profile = await authApi.getMe();
      setUser(profile);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Authentication failed. Please verify your credentials or register.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const tokenRes = await authApi.login({
        login: "demo",
        password: "demo123",
      });
      setToken(tokenRes.access_token);
      const profile = await authApi.getMe();
      setUser(profile);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Could not sign in with demo account. Please try registering an account."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTestUserLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const tokenRes = await authApi.login({
        login: "testuser",
        password: "TestPassword123!",
      });
      setToken(tokenRes.access_token);
      const profile = await authApi.getMe();
      setUser(profile);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Could not sign in with test user. Please verify server status."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (loginVal: string, passVal: string) => {
    setLoginInput(loginVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F1F5FC] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#386BFF]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00C087]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        {/* Terminal Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-gradient-to-tr from-[#386BFF] to-[#7657F6] text-white shadow-xl shadow-[#386BFF]/25">
            <TrendingUp size={28} className="animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-heading text-white">
            TradePilot AI
          </h1>
          <p className="text-xs md:text-sm text-[#94A3B8] mt-1.5 font-medium">
            Institutional NSE / BSE Real-Time Trading Terminal
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#111C30]/90 backdrop-blur-md border border-[#26354B] rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 mb-6 bg-[#0B1120] rounded-xl border border-[#26354B]/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === "login"
                  ? "bg-[#386BFF] text-white shadow-md shadow-[#386BFF]/30"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === "register"
                  ? "bg-[#386BFF] text-white shadow-md shadow-[#386BFF]/30"
                  : "text-[#94A3B8] hover:text-[#F1F5FC]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Session Timeout Banner */}
          {sessionExpiredReason && (
            <div className="mb-5 flex items-start justify-between gap-2.5 rounded-xl border border-[#F5B942]/40 bg-[#F5B942]/10 p-3.5 text-xs text-[#F5B942]">
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-[#F5B942]" />
                <div>
                  <span className="font-semibold block text-[#F1F5FC]">Session Timed Out</span>
                  <span className="text-[#CBD5E1] leading-relaxed block mt-0.5">{sessionExpiredReason}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSessionExpiredReason(null)}
                className="text-[#94A3B8] hover:text-[#F1F5FC] text-xs font-mono ml-2 p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#F04452]/40 bg-[#F04452]/10 p-3.5 text-xs text-[#F04452]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Anup Poojari"
                      className="w-full rounded-xl border border-[#26354B] bg-[#0B1120] pl-10 pr-3.5 py-2.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. anup_trader"
                      className="w-full rounded-xl border border-[#26354B] bg-[#0B1120] pl-10 pr-3.5 py-2.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="anup@example.com"
                      className="w-full rounded-xl border border-[#26354B] bg-[#0B1120] pl-10 pr-3.5 py-2.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-[#26354B] bg-[#0B1120] pl-10 pr-10 py-2.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Capital Bonus Highlight */}
                <div className="p-3 rounded-xl bg-[#00C087]/10 border border-[#00C087]/25 flex items-center space-x-2.5">
                  <CheckCircle2 size={16} className="text-[#00C087] flex-shrink-0" />
                  <span className="text-[11px] text-[#00C087] font-medium leading-tight">
                    Instant ₹10,00,000 paper trading capital credited upon registration.
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type="text"
                      required
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="e.g. demo or your email"
                      className="w-full rounded-xl border border-[#26354B] bg-[#0B1120] pl-10 pr-3.5 py-2.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full rounded-xl border border-[#26354B] bg-[#0B1120] pl-10 pr-10 py-2.5 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:border-[#386BFF] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#386BFF] to-[#4C7DFF] hover:from-[#4C7DFF] hover:to-[#5E8DFF] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#386BFF]/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <CirclingLoader size="sm" color="text-white" />
              ) : (
                <span>
                  {mode === "login"
                    ? "Sign In to Terminal"
                    : "Create Account & Start Trading"}
                </span>
              )}
            </button>
          </form>

          {/* Quick Test / Demo Accounts Option */}
          {mode === "login" && (
            <div className="mt-5 pt-5 border-t border-[#26354B]/80 text-left">
              <span className="text-[11px] font-semibold text-[#94A3B8] block mb-2 uppercase tracking-wider">
                Pre-Configured Test Accounts (API Testing)
              </span>

              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={handleQuickTestUserLogin}
                  disabled={loading}
                  className="py-2 px-2.5 rounded-lg bg-[#386BFF]/15 hover:bg-[#386BFF]/25 border border-[#386BFF]/40 text-[11px] font-semibold text-[#386BFF] hover:text-[#5E8DFF] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Login with testuser / TestPassword123!"
                >
                  <Zap size={13} />
                  <span>Test User Login</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={loading}
                  className="py-2 px-2.5 rounded-lg bg-[#00C087]/15 hover:bg-[#00C087]/25 border border-[#00C087]/40 text-[11px] font-semibold text-[#00C087] hover:text-[#00D998] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Login with demo / demo123"
                >
                  <Zap size={13} />
                  <span>Demo User Login</span>
                </button>
              </div>

              {/* Credentials hint pills */}
              <div className="p-2.5 rounded-lg bg-[#0B1120] border border-[#26354B] text-[10px] font-mono space-y-1.5">
                <div className="flex justify-between items-center text-[#94A3B8]">
                  <span>API Test User:</span>
                  <button
                    type="button"
                    onClick={() => handleFillCredentials("testuser", "TestPassword123!")}
                    className="text-[#386BFF] hover:underline cursor-pointer"
                    title="Click to fill form with testuser credentials"
                  >
                    testuser / TestPassword123!
                  </button>
                </div>
                <div className="flex justify-between items-center text-[#94A3B8]">
                  <span>Demo Trader:</span>
                  <button
                    type="button"
                    onClick={() => handleFillCredentials("demo", "demo123")}
                    className="text-[#00C087] hover:underline cursor-pointer"
                    title="Click to fill form with demo credentials"
                  >
                    demo / demo123
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Badges Footer */}
        <div className="grid grid-cols-3 gap-2 mt-6 text-center text-[10px] text-[#94A3B8]">
          <div className="p-2 rounded-xl bg-[#111C30]/50 border border-[#26354B]/50 flex flex-col items-center">
            <Activity size={14} className="text-[#00C087] mb-1" />
            <span>Live NSE/BSE Ticks</span>
          </div>
          <div className="p-2 rounded-xl bg-[#111C30]/50 border border-[#26354B]/50 flex flex-col items-center">
            <TrendingUp size={14} className="text-[#386BFF] mb-1" />
            <span>AI Price Forecasting</span>
          </div>
          <div className="p-2 rounded-xl bg-[#111C30]/50 border border-[#26354B]/50 flex flex-col items-center">
            <Shield size={14} className="text-[#7657F6] mb-1" />
            <span>Atomic Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

