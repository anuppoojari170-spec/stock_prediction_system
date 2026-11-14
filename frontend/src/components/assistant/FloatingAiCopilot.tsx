import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { predictionApi } from "../../services/api";
import { AIChatMessage } from "../../types";

export const FloatingAiCopilot: React.FC = () => {
  const {
    isAiCopilotOpen,
    toggleAiCopilot,
    activeTicker,
    setActiveTicker,
    mode,
    isSidebarCollapsed,
  } = useAppStore();

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: "assistant",
      content: `👋 Hello! I am **TradePilot AI Copilot**. I am analyzing **${activeTicker}** with live technical indicators and risk models.\n\nAsk me about any Indian stock, trade rationale, stop-loss placement, or position sizing!`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dynamicActions, setDynamicActions] = useState<string[]>([
    `Why is ${activeTicker} a buy/sell?`,
    `What is the stop-loss risk?`,
    `Calculate position size for ₹20,000`,
    `Explain RSI & MACD momentum`,
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAiCopilotOpen) {
      scrollToBottom();
    }
  }, [messages, isAiCopilotOpen]);

  // Update initial message when activeTicker changes
  useEffect(() => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Switched focus to **${activeTicker}**. Technical signals and trade plans are loaded. What would you like to evaluate?`,
      },
    ]);
  }, [activeTicker]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: AIChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await predictionApi.chatAssistant({
        message: text,
        ticker: activeTicker,
        conversation: updatedMessages.slice(-6),
        mode: mode,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
        },
      ]);

      if (res.suggested_actions && res.suggested_actions.length > 0) {
        setDynamicActions(res.suggested_actions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ I encountered an error retrieving data. Please check your network or backend connection.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionText: string) => {
    if (actionText.startsWith("Switch Terminal to ")) {
      const sym = actionText.replace("Switch Terminal to ", "").trim().toUpperCase();
      setActiveTicker(sym);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🔄 **Terminal Switched to ${sym}!** Chart, indicators, and order pad are now focused on ${sym}.`,
        },
      ]);
    } else {
      handleSend(actionText);
    }
  };

  const renderMessageContent = (content: string) => {
    // If content contains [Switch Terminal to TICKER], render as clickable button
    if (!content.includes("[Switch Terminal to ")) {
      return content;
    }
    const regex = /\[Switch Terminal to ([A-Za-z0-9_]+)\]/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const sym = match[1].toUpperCase();
      parts.push(
        <button
          key={match.index}
          onClick={() => handleActionClick(`Switch Terminal to ${sym}`)}
          className="inline-flex items-center space-x-1 px-2.5 py-1 my-1 rounded bg-[#386BFF]/20 hover:bg-[#386BFF]/30 text-[#386BFF] hover:text-white border border-[#386BFF]/40 text-[11px] font-bold font-mono transition-all cursor-pointer shadow-sm"
          title={`Click to load ${sym} into chart & order pad`}
        >
          <span>🔄 Switch Terminal to {sym}</span>
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    return parts;
  };

  return (
    <>
      {/* Floating Trigger Button on Left Side */}
      {!isAiCopilotOpen && (
        <button
          onClick={toggleAiCopilot}
          className={`fixed bottom-6 z-50 p-3.5 rounded-full bg-gradient-to-r from-[#7657F6] to-[#386BFF] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center space-x-2 border border-white/20 group cursor-pointer ${
            isSidebarCollapsed ? "left-4 md:left-[88px]" : "left-4 md:left-[256px]"
          }`}
          title="Open TradePilot AI Copilot"
        >
          <div className="relative">
            <Bot size={22} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00C087] border-2 border-[#0B1120]" />
          </div>
          <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">
            AI Copilot
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Window anchored on Left Side */}
      {isAiCopilotOpen && (
        <div
          className={`fixed bottom-6 z-50 bg-[#0B1120] border border-[#7657F6]/40 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isSidebarCollapsed ? "left-3 md:left-[84px]" : "left-3 md:left-[252px]"
          } ${
            isExpanded
              ? "w-[94vw] sm:w-[600px] h-[82vh]"
              : "w-[92vw] sm:w-[420px] h-[540px]"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-[#111C30] border-b border-[#26354B] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#7657F6] to-[#386BFF] text-white">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-heading font-bold text-xs text-[#F1F5FC]">
                    TradePilot AI Copilot
                  </h4>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#386BFF]/20 text-[#386BFF] border border-[#386BFF]/30">
                    {activeTicker}
                  </span>
                </div>
                <span className="text-[10px] text-[#94A3B8]">
                  {mode === "beginner" ? "Beginner Mode Active" : "Quantitative Intelligence Mode"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940] transition-colors"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={toggleAiCopilot}
                className="p-1 rounded text-[#94A3B8] hover:text-[#F04452] hover:bg-[#1A2940] transition-colors"
                title="Close AI Copilot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#386BFF] text-white rounded-br-none shadow-md"
                      : "bg-[#162238] text-[#F1F5FC] border border-[#26354B] rounded-bl-none shadow-sm"
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-xl bg-[#162238] border border-[#26354B] text-[#94A3B8] flex items-center space-x-2">
                  <Sparkles size={14} className="animate-spin text-[#7657F6]" />
                  <span className="text-[11px]">Analyzing {activeTicker} technicals & news...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="px-3 pt-2 pb-1 border-t border-[#26354B]/60 bg-[#0E1726]/60 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {dynamicActions.map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleActionClick(prompt)}
                className="px-2 py-1 rounded-full bg-[#1A2940] hover:bg-[#7657F6]/20 text-[#CBD5E1] hover:text-[#A78BFA] border border-[#26354B] hover:border-[#7657F6]/40 text-[10px] whitespace-nowrap transition-all flex items-center space-x-1 flex-shrink-0 cursor-pointer"
              >
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-2.5 bg-[#111C30] border-t border-[#26354B] flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask about any NSE stock (e.g. IDFC First Bank, ${activeTicker})...`}
              className="flex-1 bg-[#0B1120] border border-[#26354B] rounded-lg px-3 py-2 text-xs text-[#F1F5FC] placeholder-[#64748B] focus:outline-none focus:border-[#7657F6] transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || loading}
              className="p-2 rounded-lg bg-gradient-to-r from-[#7657F6] to-[#386BFF] text-white hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
              title="Send Message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
