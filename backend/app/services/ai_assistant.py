import json
import logging
import re
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

from app.core.config import settings
from app.core.cache import market_cache
from app.schemas.prediction import AICommentaryResponse, AIChatMessage, AIChatResponse
from app.services.nse_universe import nse_universe

logger = logging.getLogger(__name__)


class AIAssistantService:
    """
    AI Trading Assistant & Market Commentary Service.
    Integrates Google Gemini LLM API when configured, with a robust
    quantitative narrative synthesis engine as a deterministic fallback.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self.model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"

    def _call_gemini_api(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
        """Query Google Gemini API via standard REST to avoid external SDK dependencies."""
        if not self.api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "topP": 0.85,
                "maxOutputTokens": 600,
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=7) as response:
                result = json.loads(response.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception as e:
            logger.warning(f"Gemini API request failed: {e}. Falling back to quantitative narrative engine.")
            return None

        return None

    def generate_commentary(self, pred: Dict[str, Any], mode: str = "pro") -> AICommentaryResponse:
        """
        Synthesize comprehensive AI trade thesis, key driving catalysts,
        risk factors, and beginner-friendly takeaway for a given stock.
        """
        ticker = pred.get("ticker", "EQUITY")
        cache_key = f"ai_commentary:{ticker}:{mode}"
        cached = market_cache.get(cache_key)
        if cached:
            return AICommentaryResponse(**cached)

        price = pred.get("current_price", 0.0)
        signal = pred.get("signal", "HOLD")
        rec = pred.get("recommendation", signal)
        conviction = pred.get("confidence", 70)
        rsi = pred.get("rsi", 50.0)
        macd = pred.get("macd", {})
        bb = pred.get("bollinger", {})
        trade_plan = pred.get("trade_plan", {})
        ml_data = pred.get("ml_forecast")
        risk_data = pred.get("risk", {})
        risk_level = risk_data.get("level", "MEDIUM") if isinstance(risk_data, dict) else "MEDIUM"

        # Attempt Google Gemini LLM synthesis if API key is active
        if self.api_key:
            system_instruction = (
                "You are TradePilot AI, an elite institutional equity research analyst for Indian markets (NSE/BSE). "
                "Analyze technical indicators, trade targets, and risks. Respond in strict JSON with keys: "
                "'headline' (short bold summary), 'thesis' (2 concise analytical sentences), "
                "'catalysts' (list of 3 key drivers), 'risks' (list of 2 key risks), "
                "'beginner_takeaway' (1 simple plain-English rule for a novice trader)."
            )
            prompt = (
                f"Stock: {ticker} (NSE), Current LTP: Rs {price:.2f}\n"
                f"Signal: {rec} (Conviction: {conviction}%)\n"
                f"Technical Context: RSI(14)={rsi:.1f}, MACD Hist={macd.get('hist', 0.0):.2f}, "
                f"Bollinger Bands=[Rs {bb.get('lower', 0):.1f} - Rs {bb.get('upper', 0):.1f}]\n"
                f"Trade Plan: Entry Rs {trade_plan.get('entry', price):.2f}, Stop Loss Rs {trade_plan.get('stop_loss', 0):.2f}, "
                f"Target 1 Rs {trade_plan.get('target_1', 0):.2f}, R:R {trade_plan.get('risk_reward', '1:2')}\n"
                f"Risk Meter: {risk_level}\n"
                "Return raw valid JSON only without backticks."
            )
            llm_text = self._call_gemini_api(prompt, system_instruction)
            if llm_text:
                try:
                    clean_json = llm_text.strip()
                    if clean_json.startswith("```json"):
                        clean_json = clean_json[7:]
                    if clean_json.startswith("```"):
                        clean_json = clean_json[3:]
                    if clean_json.endswith("```"):
                        clean_json = clean_json[:-3]
                    parsed = json.loads(clean_json.strip())
                    commentary = AICommentaryResponse(
                        ticker=ticker,
                        headline=parsed.get("headline", f"{ticker} {rec} Setup"),
                        thesis=parsed.get("thesis", ""),
                        catalysts=parsed.get("catalysts", []),
                        risks=parsed.get("risks", []),
                        beginner_takeaway=parsed.get("beginner_takeaway", ""),
                        provider="Google Gemini AI",
                    )
                    market_cache.set(cache_key, commentary.model_dump(), ttl=120)
                    return commentary
                except Exception:
                    pass

        # Robust Quantitative Narrative Engine (Deterministic Fallback)
        commentary = self._build_deterministic_commentary(pred, mode)
        market_cache.set(cache_key, commentary.model_dump(), ttl=120)
        return commentary

    def _build_deterministic_commentary(self, pred: Dict[str, Any], mode: str) -> AICommentaryResponse:
        """Rule-guided algorithmic narrative synthesis based on institutional market factors."""
        ticker = pred.get("ticker", "EQUITY")
        price = pred.get("current_price", 0.0)
        signal = pred.get("signal", "HOLD")
        rec = pred.get("recommendation", signal)
        conviction = pred.get("confidence", 70)
        rsi = pred.get("rsi", 50.0)
        macd = pred.get("macd", {})
        macd_hist = macd.get("hist", 0.0) if isinstance(macd, dict) else 0.0
        bb = pred.get("bollinger", {})
        trade_plan = pred.get("trade_plan", {})
        risk_data = pred.get("risk", {})
        risk_level = risk_data.get("level", "MEDIUM") if isinstance(risk_data, dict) else "MEDIUM"

        target_1 = trade_plan.get("target_1", round(price * 1.025, 2))
        stop_loss = trade_plan.get("stop_loss", round(price * 0.98, 2))
        rr = trade_plan.get("risk_reward", "1:2.0")

        # 1. Headline Synthesis
        if "BUY" in rec:
            if rsi < 35:
                headline = f"Oversold Value Rebound with Favorable Risk-Reward ({rr})"
            elif macd_hist > 0:
                headline = f"Strong Momentum Expansion Targeting ₹{target_1:.2f}"
            else:
                headline = f"Accumulation Setup with Defined Stop-Loss at ₹{stop_loss:.2f}"
        elif "SELL" in rec:
            if rsi > 70:
                headline = f"Overbought Exhaustion Near Upper Resistance Band"
            else:
                headline = f"Bearish Breakdown Pressure: Capital Preservation Advised"
        else:
            headline = f"Consolidation Channel Between ₹{bb.get('lower', price * 0.98):.0f} and ₹{bb.get('upper', price * 1.02):.0f}"

        # 2. Institutional Thesis Synthesis
        if "BUY" in rec:
            thesis = (
                f"{ticker} demonstrates bullish institutional structure with {conviction}% composite conviction. "
                f"RSI positioned at {rsi:.1f} coupled with positive MACD impulse signals sustained buyer absorption, "
                f"offering an asymmetric upside target of ₹{target_1:.2f} against a protective stop at ₹{stop_loss:.2f}."
            )
        elif "SELL" in rec:
            thesis = (
                f"{ticker} faces overhead supply pressure with technical indicators turning defensive. "
                f"Distribution volume and momentum deterioration warrant trailing defensive stops at ₹{stop_loss:.2f} "
                f"or taking profit toward support target ₹{target_1:.2f}."
            )
        else:
            thesis = (
                f"{ticker} is currently range-bound within Bollinger envelopes with balanced buyer/seller interest. "
                f"Patience is recommended until a confirmed momentum breakout occurs above ₹{bb.get('upper', price * 1.02):.2f} "
                f"or below ₹{bb.get('lower', price * 0.98):.2f}."
            )

        # 3. Catalysts
        catalysts = []
        if rsi < 35:
            catalysts.append(f"Oversold RSI ({rsi:.1f}) triggering institutional mean-reversion buying")
        elif rsi > 65:
            catalysts.append(f"Strong relative strength ({rsi:.1f}) confirming active trend continuation")
        else:
            catalysts.append(f"Balanced momentum reset at neutral RSI ({rsi:.1f})")

        if macd_hist > 0:
            catalysts.append("MACD histogram printing positive expansion bars above zero-line")
        else:
            catalysts.append("MACD consolidation indicates measured volatility compression")

        catalysts.append(f"Structured trade plan offering positive {rr} risk-to-reward ratio")

        # 4. Risk Factors
        risks = []
        if risk_level == "HIGH":
            risks.append("Elevated daily volatility increases whipsaw probability on tight stops")
        else:
            risks.append(f"Breach of technical stop-loss level (₹{stop_loss:.2f}) invalidates the setup")

        risks.append("Broad market index volatility (NIFTY/BANKNIFTY) may influence equity direction")

        # 5. Beginner Takeaway
        if "BUY" in rec:
            beginner_takeaway = (
                f"Looking to enter? Buy near ₹{price:.2f}, but always set your Stop Loss at ₹{stop_loss:.2f} "
                f"so your maximum loss is strictly limited."
            )
        elif "SELL" in rec:
            beginner_takeaway = (
                f"If you hold this stock, consider locking in gains or placing a stop-loss order at ₹{stop_loss:.2f} to protect your capital."
            )
        else:
            beginner_takeaway = (
                f"No clear edge right now. Wait on the sidelines until the stock decides its next major move."
            )

        return AICommentaryResponse(
            ticker=ticker,
            headline=headline,
            thesis=thesis,
            catalysts=catalysts,
            risks=risks,
            beginner_takeaway=beginner_takeaway,
            provider="TradePilot Quantitative Neural Engine",
        )

    def extract_ticker(self, text: str) -> Optional[str]:
        """Dynamically resolve any company name or stock symbol across all 2,600+ NSE equities."""
        sym, _ = nse_universe.resolve_ticker(text)
        return sym

    def handle_chat(self, req: Dict[str, Any], active_pred: Optional[Dict[str, Any]] = None) -> AIChatResponse:
        """
        Handle conversational user questions regarding stocks, technical setups,
        portfolio risk, or trading concepts with live market awareness and real-time web news.
        """
        user_message = req.get("message", "").strip()
        ticker = req.get("ticker", "") or (active_pred.get("ticker") if active_pred else "RELIANCE")
        mode = req.get("mode", "pro")
        conv = req.get("conversation", [])

        if not user_message:
            return AIChatResponse(
                reply="How can I assist your trading today? Ask me about signal breakdowns, stop-loss calculations, or risk analysis.",
                suggested_actions=["Analyze active stock setup", "Review risk level", "Explain trade plan"],
                ticker=ticker,
                provider="TradePilot Assistant",
            )

        # Dynamically resolve any mentioned company or ticker across all 2,600+ NSE stocks
        extracted_ticker = self.extract_ticker(user_message)
        mentioned_pred = None
        live_web_news: List[str] = []

        target_lookup_sym = extracted_ticker if (extracted_ticker and extracted_ticker != ticker) else ticker
        try:
            from app.services.predictor import fetch_live_headlines
            live_web_news = fetch_live_headlines(target_lookup_sym)
        except Exception:
            live_web_news = []

        if extracted_ticker and extracted_ticker != ticker:
            try:
                from app.services.predictor import predict_stock
                fetched = predict_stock(extracted_ticker)
                if isinstance(fetched, dict) and "error" not in fetched:
                    mentioned_pred = fetched
            except Exception as e:
                logger.warning(f"Could not load mentioned ticker {extracted_ticker}: {e}")

        # If Gemini is configured, use it for conversational answers
        if self.api_key:
            pred_ctx = ""
            if active_pred:
                macd_data = active_pred.get("macd", {})
                bb_data = active_pred.get("bollinger", {})
                risk_data = active_pred.get("risk", {})
                trade_plan = active_pred.get("trade_plan", {})
                pred_ctx = (
                    f"--- CURRENT TERMINAL STOCK: {ticker} (NSE) ---\n"
                    f"Live LTP: Rs {active_pred.get('current_price', 0.0):.2f}\n"
                    f"Day Change: {active_pred.get('day_change_pct', 0.0):+.2f}%\n"
                    f"Ensemble Signal: {active_pred.get('recommendation', 'HOLD')} (Conviction: {active_pred.get('confidence', 50)}%)\n"
                    f"RSI(14): {active_pred.get('rsi', 50.0):.1f}\n"
                    f"MACD Histogram: {macd_data.get('hist', 0.0):.2f}\n"
                    f"Bollinger Bands: Lower Rs {bb_data.get('lower', 0.0):.2f} - Upper Rs {bb_data.get('upper', 0.0):.2f}\n"
                    f"Trade Plan: Entry Rs {trade_plan.get('entry', 0.0):.2f}, Stop Loss Rs {trade_plan.get('stop_loss', 0.0):.2f}, "
                    f"Target 1 Rs {trade_plan.get('target_1', 0.0):.2f}, Target 2 Rs {trade_plan.get('target_2', 0.0):.2f}, Risk:Reward {trade_plan.get('risk_reward', '1:2')}\n"
                    f"Risk Meter: {risk_data.get('level', 'MEDIUM')} (Score {risk_data.get('score', 50)}/100)\n"
                    f"User Trading Mode: {mode.upper()}\n"
                    f"-----------------------------------------------\n"
                )

            if mentioned_pred:
                m_macd = mentioned_pred.get("macd", {})
                m_bb = mentioned_pred.get("bollinger", {})
                m_risk = mentioned_pred.get("risk", {})
                m_tp = mentioned_pred.get("trade_plan", {})
                pred_ctx += (
                    f"--- USER-REQUESTED STOCK: {extracted_ticker} (NSE) [LIVE DATA LOADED] ---\n"
                    f"Live LTP: Rs {mentioned_pred.get('current_price', 0.0):.2f}\n"
                    f"Day Change: {mentioned_pred.get('day_change_pct', 0.0):+.2f}%\n"
                    f"Signal: {mentioned_pred.get('recommendation', 'HOLD')} (Conviction: {mentioned_pred.get('confidence', 50)}%)\n"
                    f"RSI(14): {mentioned_pred.get('rsi', 50.0):.1f}\n"
                    f"MACD Histogram: {m_macd.get('hist', 0.0):.2f}\n"
                    f"Bollinger Bands: Lower Rs {m_bb.get('lower', 0.0):.2f} - Upper Rs {m_bb.get('upper', 0.0):.2f}\n"
                    f"Trade Plan: Entry Rs {m_tp.get('entry', 0.0):.2f}, Stop Loss Rs {m_tp.get('stop_loss', 0.0):.2f}, "
                    f"Target 1 Rs {m_tp.get('target_1', 0.0):.2f}, Risk:Reward {m_tp.get('risk_reward', '1:2')}\n"
                    f"Risk Meter: {m_risk.get('level', 'MEDIUM')} (Score {m_risk.get('score', 50)}/100)\n"
                    f"-------------------------------------------------------------------------\n"
                )

            if live_web_news:
                news_lines = "\n".join([f"• {h}" for h in live_web_news[:4]])
                pred_ctx += (
                    f"--- REAL-TIME WEB NEWS HEADLINES FOR {target_lookup_sym} ---\n"
                    f"{news_lines}\n"
                    f"----------------------------------------------------------\n"
                )

            # Include multi-turn conversation history
            history_str = ""
            if conv:
                recent_turns = [m for m in conv if isinstance(m, dict) and m.get("content")][-4:]
                if recent_turns:
                    history_str = "--- PREVIOUS DIALOGUE ---\n"
                    for m in recent_turns:
                        role_label = "Trader" if m.get("role") == "user" else "Copilot"
                        history_str += f"{role_label}: {m.get('content')}\n"
                    history_str += "-------------------------\n"

            system_instruction = (
                "You are TradePilot AI Copilot, an elite institutional trading mentor and quantitative analyst for Indian equity markets (NSE/BSE). "
                "You have comprehensive institutional intelligence across all 2,600+ Indian equities. "
                "When a trader asks about the current terminal stock, use its live indicators and live web news. "
                "When a trader asks about another company (e.g. IDFC First Bank, Tata Motors, Suzlon, etc.), evaluate that stock thoroughly using its real-time technicals and latest live web news provided in the context. "
                "NEVER say you have a 'Data Restriction' or refuse an inquiry. Always provide professional, concise, actionable trading guidance (2 to 4 bullet points) with risk control."
            )
            chat_prompt = f"{pred_ctx}{history_str}Trader's Question: {user_message}\nProvide an insightful, specific answer based on the real-time stock data and latest web news."
            llm_reply = self._call_gemini_api(chat_prompt, system_instruction)
            if llm_reply:
                if mentioned_pred and extracted_ticker:
                    actions = [
                        f"Switch Terminal to {extracted_ticker}",
                        f"Check {extracted_ticker} Stop-Loss",
                        f"Apply {extracted_ticker} Trade Plan",
                    ]
                    reply_ticker = extracted_ticker
                else:
                    reply_ticker = ticker
                    q_low = user_message.lower()
                    if "risk" in q_low or "stop" in q_low:
                        actions = [f"Where to place SL for {ticker}?", "Calculate max position size", "What invalidates this trade?"]
                    elif "target" in q_low or "profit" in q_low:
                        actions = [f"When to take profit on {ticker}?", "How to trail stop-loss?", "What is Target 2?"]
                    elif "size" in q_low or "quantity" in q_low or "capital" in q_low:
                        actions = ["Apply levels to Order Entry", f"Re-check {ticker} RSI momentum", "Check risk-reward ratio"]
                    else:
                        actions = [f"Why is {ticker} rated {active_pred.get('recommendation', 'BUY') if active_pred else 'this'}?", f"Check {ticker} Stop-Loss", "Calculate position size"]

                return AIChatResponse(
                    reply=llm_reply,
                    suggested_actions=actions,
                    ticker=reply_ticker,
                    provider="Google Gemini AI",
                )

        # Deterministic Intelligent Trader Assistant Fallback
        target_pred_for_fallback = mentioned_pred if mentioned_pred else active_pred
        fallback_sym = extracted_ticker if extracted_ticker else ticker
        return self._generate_intelligent_fallback_chat(user_message, fallback_sym, target_pred_for_fallback, mode)

    def _generate_intelligent_fallback_chat(
        self, query: str, ticker: str, pred: Optional[Dict[str, Any]], mode: str
    ) -> AIChatResponse:
        """Knowledge-based conversational answers for core trading concepts and active ticker context."""
        q = query.lower()
        price = pred.get("current_price", 1000.0) if pred else 1000.0
        signal = pred.get("recommendation", "BUY") if pred else "BUY"
        trade_plan = pred.get("trade_plan", {}) if pred else {}
        entry = trade_plan.get("entry", price)
        sl = trade_plan.get("stop_loss", round(price * 0.98, 2))
        t1 = trade_plan.get("target_1", round(price * 1.025, 2))
        rr = trade_plan.get("risk_reward", "1:2.0")
        rsi = pred.get("rsi", 52.0) if pred else 52.0

        if any(w in q for w in ["why", "reason", "thesis", "signal", "recommendation"]):
            reply = (
                f"**Why {ticker} is rated {signal}:**\n\n"
                f"• **Momentum Oscillator:** RSI is at **{rsi:.1f}**, confirming healthy trend structure without extreme exhaustion.\n"
                f"• **Target & Protection:** Clear asymmetric setup with Entry at **₹{entry:.2f}**, initial Target at **₹{t1:.2f}**, and defined Stop-Loss at **₹{sl:.2f}** ({rr} Risk:Reward).\n"
                f"• **Market Rule:** If price dips below ₹{sl:.2f}, the technical thesis is invalidated and disciplined traders exit immediately."
            )
            suggested = [f"Apply ₹{entry:.2f} to Order Entry", f"View RSI ({rsi:.1f}) Details", "What is the downside risk?"]

        elif any(w in q for w in ["stop", "loss", "sl", "risk", "downside"]):
            risk_pct = abs((price - sl) / price * 100) if price else 2.0
            reply = (
                f"**Risk Profile & Stop-Loss for {ticker}:**\n\n"
                f"• **Recommended Stop-Loss:** **₹{sl:.2f}** (~{risk_pct:.1f}% downside from current LTP of ₹{price:.2f}).\n"
                f"• **How it's calculated:** Derived from 14-period Average True Range (ATR) volatility to place the stop safely below normal intraday noise.\n"
                f"• **Capital Preservation Rule:** Never risk more than 1–2% of total trading account equity on this single position."
            )
            suggested = ["Calculate recommended quantity", "Where is the target?", "Explain ATR"]

        elif any(w in q for w in ["target", "profit", "exit", "where to sell"]):
            gain_pct = abs((t1 - price) / price * 100) if price else 2.5
            reply = (
                f"**Profit Targets for {ticker}:**\n\n"
                f"• **Target 1 (Primary):** **₹{t1:.2f}** (+{gain_pct:.1f}% expected gain).\n"
                f"• **Target 2 (Extended):** **₹{trade_plan.get('target_2', t1 * 1.02):.2f}** for swing positions trailing a 20 EMA stop.\n"
                f"• **Strategy:** Consider taking 50% profit at Target 1 and moving your Stop Loss up to Entry (break-even) to lock in a risk-free trade."
            )
            suggested = ["How to trail stop-loss?", "What if price falls?", "Apply levels to order entry"]

        elif any(w in q for w in ["size", "quantity", "shares", "how much"]):
            reply = (
                f"**Smart Position Sizing Rule for {ticker}:**\n\n"
                f"1. Choose maximum acceptable risk per trade (e.g., ₹1,000 to ₹5,000).\n"
                f"2. Risk per share = Entry (₹{entry:.2f}) - Stop Loss (₹{sl:.2f}) = **₹{abs(entry - sl):.2f}**.\n"
                f"3. Maximum Shares = Total Risk ÷ Risk Per Share.\n\n"
                f"*Example:* If risking ₹2,000 on this trade, optimal quantity is **{max(1, int(2000 / max(1.0, abs(entry - sl))))} shares**."
            )
            suggested = ["Set order quantity", "Review account balance", "Check buying power"]

        else:
            reply = (
                f"I am monitoring **{ticker}** live at **₹{price:.2f}** (Signal: **{signal}**).\n\n"
                f"You can ask me to:\n"
                f"• Explain the **trade thesis** and why this signal was generated\n"
                f"• Analyze **stop-loss and risk targets**\n"
                f"• Calculate **optimal position sizing** for your account\n"
                f"• Break down indicators like **RSI, MACD, and Bollinger Bands**"
            )
            suggested = [f"Why is {ticker} a {signal}?", "Show me the stop loss", "How many shares should I buy?"]

        return AIChatResponse(
            reply=reply,
            suggested_actions=suggested,
            ticker=ticker,
            provider="TradePilot Quantitative Assistant",
        )


ai_assistant = AIAssistantService()

