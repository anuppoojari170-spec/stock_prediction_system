/* =========================================================================
   TradePilot AI — Frontend Application Logic
   Organized into focused modules: config/helpers, toasts, dashboard,
   market overview, prediction, chart, watchlist, assistant, trading,
   portfolio/transactions, activity feed, search, floating bot.
   ========================================================================= */

const API = (window.location.protocol.startsWith("http") && window.location.port !== "8080")
    ? ""
    : "http://127.0.0.1:5001";

const STOCK_DIRECTORY = [
    { ticker: "TCS", name: "Tata Consultancy Services" },
    { ticker: "INFY", name: "Infosys" },
    { ticker: "RELIANCE", name: "Reliance Industries" },
    { ticker: "HDFCBANK", name: "HDFC Bank" },
    { ticker: "ICICIBANK", name: "ICICI Bank" },
    { ticker: "WIPRO", name: "Wipro" },
    { ticker: "SBIN", name: "State Bank of India" },
    { ticker: "ITC", name: "ITC Limited" },
    { ticker: "HINDUNILVR", name: "Hindustan Unilever" },
    { ticker: "BAJFINANCE", name: "Bajaj Finance" },
    { ticker: "KOTAKBANK", name: "Kotak Mahindra Bank" },
    { ticker: "LT", name: "Larsen & Toubro" },
    { ticker: "MARUTI", name: "Maruti Suzuki" },
    { ticker: "AXISBANK", name: "Axis Bank" },
    { ticker: "ASIANPAINT", name: "Asian Paints" },
];

/* ---------------------------------------------------------------------
   Generic fetch helper with error handling
   --------------------------------------------------------------------- */

async function apiGet(path) {
    const res = await fetch(`${API}${path}`);
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

async function apiDelete(path) {
    const res = await fetch(`${API}${path}`, { method: "DELETE" });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

/* ---------------------------------------------------------------------
   Formatting helpers
   --------------------------------------------------------------------- */

function formatINR(value) {
    const num = Number(value) || 0;
    return "\u20B9" + num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatPct(value) {
    const num = Number(value) || 0;
    const sign = num > 0 ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
}

function timeAgo(timestamp) {
    if (!timestamp) return "";
    const then = new Date(timestamp.replace(" ", "T") + "Z");
    if (isNaN(then.getTime())) return timestamp;
    const diffMs = Date.now() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
}

function animateCountUp(el, targetValue, formatter, duration = 700) {
    if (!el) return;
    const start = parseFloat(el.dataset.rawValue || "0") || 0;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (targetValue - start) * eased;
        el.textContent = formatter(current);
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.dataset.rawValue = String(targetValue);
        }
    }
    requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------------
   Toast notifications
   --------------------------------------------------------------------- */

const TOAST_ICONS = { success: "\u2714", error: "\u2716", warning: "\u26A0" };

function showToast(type, message, duration = 3800) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${TOAST_ICONS[type] || ""}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    stack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("closing");
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
}

/* ---------------------------------------------------------------------
   Dashboard summary
   --------------------------------------------------------------------- */

let lastSignalForChart = null;

async function loadDashboard() {
    try {
        const data = await apiGet("/api/dashboard");

        animateCountUp(document.getElementById("balance"), data.balance, formatINR);
        document.getElementById("holdings").textContent = data.holdings_count ?? 0;
        document.getElementById("transactionsCount").textContent = data.transactions_count ?? 0;

        const pnlEl = document.getElementById("todaysPnl");
        const todaysPnl = data.todays_pnl ?? 0;
        pnlEl.textContent = formatINR(todaysPnl);
        pnlEl.classList.toggle("positive", todaysPnl >= 0);
        pnlEl.classList.toggle("negative", todaysPnl < 0);
        document.getElementById("pnlCard").dataset.accent = todaysPnl >= 0 ? "emerald" : "red";

        document.getElementById("sidebarBalance").textContent = formatINR(data.balance);
        document.getElementById("topbarBalance").textContent = formatINR(data.balance);

        const topbarPnl = document.getElementById("topbarPnl");
        topbarPnl.textContent = formatINR(todaysPnl);
        document.getElementById("topbarPnlPill").classList.toggle("negative", todaysPnl < 0);

        const growthEl = document.getElementById("portfolioGrowth");
        if (growthEl) {
            const growth = data.growth_pct ?? 0;
            growthEl.textContent = `${formatPct(growth)} overall`;
            growthEl.style.color = growth >= 0 ? "var(--emerald)" : "var(--red)";
        }
    } catch (err) {
        console.error("Dashboard load failed:", err);
    }
}

/* ---------------------------------------------------------------------
   Market Overview — indices
   --------------------------------------------------------------------- */

async function loadMarketOverview() {
    const grid = document.getElementById("indexGrid");
    try {
        const data = await apiGet("/api/market-overview");
        grid.innerHTML = "";

        data.forEach((idx, i) => {
            const card = document.createElement("div");
            card.className = "index-card";
            card.style.animationDelay = `${i * 60}ms`;

            if (idx.error) {
                card.innerHTML = `
                    <div class="index-name">${escapeHtml(idx.name)}</div>
                    <div class="index-value" style="color:var(--text-muted);font-size:14px;">Data unavailable</div>
                `;
            } else {
                const dirClass = idx.direction === "up" ? "up" : "down";
                const arrow = idx.direction === "up" ? "\u25B2" : "\u25BC";
                card.innerHTML = `
                    <div class="index-name">${escapeHtml(idx.name)}</div>
                    <div class="index-value-row">
                        <span class="index-value mono">${idx.value.toLocaleString("en-IN")}</span>
                        <span class="index-change ${dirClass} mono">${arrow} ${formatPct(idx.change_pct)}</span>
                    </div>
                `;
            }
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = `<div class="empty-row">Market data unavailable right now.</div>`;
    }
}

/* ---------------------------------------------------------------------
   Market Sentiment Gauge
   --------------------------------------------------------------------- */

async function loadSentiment() {
    try {
        const data = await apiGet("/api/sentiment");
        const score = data.score ?? 50;

        const gaugeFill = document.getElementById("gaugeFill");
        const gaugeNeedle = document.getElementById("gaugeNeedle");
        const labelEl = document.getElementById("sentimentLabel");
        const scoreEl = document.getElementById("sentimentScore");
        const breakdownEl = document.getElementById("sentimentBreakdown");

        const circumference = 267;
        const offset = circumference - (score / 100) * circumference;
        gaugeFill.style.strokeDashoffset = String(offset);

        const color = score >= 60 ? "var(--emerald)" : score <= 40 ? "var(--red)" : "var(--gold)";
        gaugeFill.style.stroke = color;

        // Needle rotates from -90deg (bearish, left) to +90deg (bullish, right)
        const angle = -90 + (score / 100) * 180;
        gaugeNeedle.style.transform = `rotate(${angle}deg)`;

        labelEl.textContent = data.label || "NEUTRAL";
        labelEl.style.color = color;
        scoreEl.textContent = `${score}/100`;

        breakdownEl.innerHTML = `
            <span><b>${data.buy ?? 0}</b> Buy</span>
            <span><b>${data.hold ?? 0}</b> Hold</span>
            <span><b>${data.sell ?? 0}</b> Sell</span>
        `;
    } catch (err) {
        console.error("Sentiment load failed:", err);
    }
}

/* ---------------------------------------------------------------------
   Top Gainers / Losers
   --------------------------------------------------------------------- */

async function loadMovers() {
    const gainersEl = document.getElementById("gainersList");
    const losersEl = document.getElementById("losersList");

    try {
        const data = await apiGet("/api/movers");
        renderMoversList(gainersEl, data.gainers, "up");
        renderMoversList(losersEl, data.losers, "down");
    } catch (err) {
        gainersEl.innerHTML = `<div class="empty-row">Unavailable right now.</div>`;
        losersEl.innerHTML = `<div class="empty-row">Unavailable right now.</div>`;
    }
}

function renderMoversList(container, items, direction) {
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-row">No data available.</div>`;
        return;
    }

    container.innerHTML = "";
    items.forEach((item, i) => {
        const row = document.createElement("div");
        row.className = "mover-row";
        row.style.animationDelay = `${i * 50}ms`;
        row.innerHTML = `
            <div>
                <div class="mover-ticker">${escapeHtml(item.ticker)}</div>
                <div class="mover-price mono">${formatINR(item.price)}</div>
            </div>
            <span class="mover-change ${direction} mono">${formatPct(item.change_pct)}</span>
        `;
        row.onclick = () => {
            document.getElementById("ticker").value = item.ticker;
            scrollToSection("predict");
            runPrediction();
        };
        container.appendChild(row);
    });
}

/* ---------------------------------------------------------------------
   AI Stock Prediction
   --------------------------------------------------------------------- */

const RECOMMENDATION_CLASS = {
    "STRONG BUY": "buy-strong",
    "BUY": "buy",
    "HOLD": "hold",
    "SELL": "sell",
    "STRONG SELL": "sell-strong",
};

async function runPrediction() {
    const tickerInput = document.getElementById("ticker");
    const ticker = tickerInput.value.trim();
    const btn = document.getElementById("predictBtn");
    const resultEl = document.getElementById("predictionResult");

    if (!ticker) {
        showToast("warning", "Please enter a stock symbol");
        return;
    }

    btn.classList.add("loading");
    btn.textContent = "Analyzing\u2026";

    try {
        const res = await fetch(`${API}/api/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker }),
        });
        const data = await res.json();

        if (data.error) {
            showToast("error", data.error);
            resultEl.innerHTML = "";
            return;
        }

        renderPrediction(data);
        loadChart(ticker, data);
        showToast("success", `Generated ${data.recommendation || data.signal} signal for ${data.ticker}`);
    } catch (err) {
        showToast("error", "Could not reach the prediction service");
    } finally {
        btn.classList.remove("loading");
        btn.textContent = "Analyze";
    }
}

function renderPrediction(data) {
    const resultEl = document.getElementById("predictionResult");
    const badgeClass = RECOMMENDATION_CLASS[data.recommendation] || "hold";
    const risk = data.risk || { level: "MEDIUM", score: 50 };
    const riskClass = `risk-${risk.level.toLowerCase()}`;
    const dayChange = data.day_change_pct ?? 0;

    resultEl.innerHTML = `
        <div class="result-head">
            <span class="result-ticker">${escapeHtml(data.ticker)}</span>
            <span class="signal-badge ${badgeClass}">${escapeHtml(data.recommendation || data.signal)}</span>
        </div>

        <div class="result-meta-grid">
            <div class="result-meta-item">
                <div class="result-meta-label">Current Price</div>
                <div class="result-meta-value mono">${formatINR(data.current_price)}</div>
            </div>
            <div class="result-meta-item">
                <div class="result-meta-label">Day Change</div>
                <div class="result-meta-value mono ${dayChange >= 0 ? "positive" : "negative"}">${formatPct(dayChange)}</div>
            </div>
            <div class="result-meta-item">
                <div class="result-meta-label">MA5 / MA20</div>
                <div class="result-meta-value mono">${data.ma5} / ${data.ma20}</div>
            </div>
        </div>

        <div class="meter-row">
            <div class="meter-label-row"><span>Confidence</span><span class="mono">${data.confidence}%</span></div>
            <div class="meter-track"><div class="meter-fill confidence" style="width:0%" data-target="${data.confidence}"></div></div>
        </div>

        <div class="meter-row">
            <div class="meter-label-row"><span>Risk &mdash; ${escapeHtml(risk.level)}</span><span class="mono">${risk.score}/100</span></div>
            <div class="meter-track"><div class="meter-fill ${riskClass}" style="width:0%" data-target="${risk.score}"></div></div>
        </div>
    `;

    requestAnimationFrame(() => {
        resultEl.querySelectorAll(".meter-fill").forEach(el => {
            el.style.width = `${el.dataset.target}%`;
        });
    });
}

/* ---------------------------------------------------------------------
   Chart — TradingView-inspired styling with bullish/bearish coloring
   --------------------------------------------------------------------- */

let chart = null;

async function loadChart(ticker, predictionData) {
    try {
        const data = await apiGet(`/api/history/${ticker}`);

        if (!Array.isArray(data) || data.length === 0) {
            console.error("History API error:", data);
            return;
        }

        const labels = data.map(item => item.date);
        const prices = data.map(item => item.close);

        const signal = predictionData ? predictionData.signal : lastSignalForChart;
        lastSignalForChart = signal;

        const isPositive = signal !== "SELL";
        const lineColor = isPositive ? "#00d97e" : "#ff4d5e";
        const bgGradientTop = isPositive ? "rgba(0,217,126,0.28)" : "rgba(255,77,94,0.28)";
        const bgGradientBottom = isPositive ? "rgba(0,217,126,0.0)" : "rgba(255,77,94,0.0)";

        const ctx = document.getElementById("stockChart").getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 360);
        gradient.addColorStop(0, bgGradientTop);
        gradient.addColorStop(1, bgGradientBottom);

        if (chart) chart.destroy();

        document.getElementById("chartTitle").textContent = `${ticker.toUpperCase()} \u2014 30 Day Price Chart`;

        const badge = document.getElementById("chartSignalBadge");
        if (signal) {
            badge.textContent = signal;
            badge.style.background = isPositive ? "var(--emerald-dim)" : "var(--red-dim)";
            badge.style.color = isPositive ? "var(--emerald)" : "var(--red)";
        }

        chart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: `${ticker.toUpperCase()} Close Price`,
                    data: prices,
                    borderColor: lineColor,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: lineColor,
                    pointHoverBorderColor: "#fff",
                    pointHoverBorderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 900, easing: "easeOutQuart" },
                interaction: { intersect: false, mode: "index" },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#161f37",
                        titleColor: "#eef2f8",
                        bodyColor: "#8e9ab3",
                        borderColor: "#22304a",
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        displayColors: false,
                        callbacks: {
                            label: (item) => `\u20B9 ${item.formattedValue}`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: "rgba(255,255,255,0.04)" },
                        ticks: { color: "#5b6680", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                    },
                    y: {
                        grid: { color: "rgba(255,255,255,0.04)" },
                        ticks: {
                            color: "#5b6680",
                            callback: (val) => "\u20B9" + val,
                        },
                    },
                },
            },
        });
    } catch (err) {
        console.error("Chart load failed:", err);
    }
}

/* ---------------------------------------------------------------------
   Watchlist — persisted server-side
   --------------------------------------------------------------------- */

async function loadWatchlist() {
    const container = document.getElementById("watchlistContainer");
    try {
        const data = await apiGet("/api/watchlist");

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="empty-row">Your watchlist is empty. Add a stock above.</div>`;
            return;
        }

        container.innerHTML = "";
        data.forEach((item, i) => {
            const row = document.createElement("div");
            row.className = "watchlist-item";
            row.style.animationDelay = `${i * 40}ms`;
            row.innerHTML = `
                <div class="watchlist-item-left">
                    <span class="watchlist-ticker">${escapeHtml(item.ticker)}</span>
                </div>
                <div class="watchlist-item-actions">
                    <button class="wl-action-btn pin-btn ${item.pinned ? "pin-active" : ""}" title="Pin">\u2605</button>
                    <button class="wl-action-btn remove-btn" title="Remove">\u2715</button>
                </div>
            `;

            row.addEventListener("click", (e) => {
                if (e.target.closest(".wl-action-btn")) return;
                document.getElementById("ticker").value = item.ticker;
                runPrediction();
            });

            row.querySelector(".pin-btn").addEventListener("click", async (e) => {
                e.stopPropagation();
                await apiPost(`/api/watchlist/${item.ticker}/pin`);
                loadWatchlist();
            });

            row.querySelector(".remove-btn").addEventListener("click", async (e) => {
                e.stopPropagation();
                await apiDelete(`/api/watchlist/${item.ticker}`);
                showToast("success", `${item.ticker} removed from watchlist`);
                loadWatchlist();
            });

            container.appendChild(row);
        });
    } catch (err) {
        container.innerHTML = `<div class="empty-row">Could not load watchlist.</div>`;
    }
}

async function addToWatchlist() {
    const input = document.getElementById("watchlistInput");
    const ticker = input.value.trim().toUpperCase();

    if (!ticker) {
        showToast("warning", "Please enter a stock symbol");
        return;
    }

    const { ok, data } = await apiPost("/api/watchlist", { ticker });
    if (ok) {
        showToast("success", data.message || `${ticker} added to watchlist`);
        input.value = "";
        loadWatchlist();
        loadActivity();
    } else {
        showToast("error", data.message || "Could not add to watchlist");
    }
}

/* ---------------------------------------------------------------------
   AI Trading Assistant
   --------------------------------------------------------------------- */

async function loadAssistant() {
    const feed = document.getElementById("assistantFeed");
    try {
        const tickers = "RELIANCE,TCS,HDFCBANK,INFY,WIPRO";
        const data = await apiGet(`/api/assistant?tickers=${tickers}`);

        if (!data.insights || data.insights.length === 0) {
            feed.innerHTML = `<div class="empty-row">No insights available right now.</div>`;
            return;
        }

        feed.innerHTML = "";
        data.insights.forEach((insight, i) => {
            const row = document.createElement("div");
            row.className = "assistant-row";
            row.style.animationDelay = `${i * 70}ms`;
            const dotClass = insight.signal === "BUY" ? "buy" : insight.signal === "SELL" ? "sell" : "hold";
            row.innerHTML = `
                <span class="assistant-signal-dot ${dotClass}"></span>
                <span class="assistant-text"><b>${escapeHtml(insight.ticker)}</b> &mdash; ${escapeHtml(insight.text)}</span>
            `;
            feed.appendChild(row);
        });
    } catch (err) {
        feed.innerHTML = `<div class="empty-row">Assistant is unavailable right now.</div>`;
    }
}

/* ---------------------------------------------------------------------
   Search autocomplete (topbar + ticker input + watchlist input)
   --------------------------------------------------------------------- */

function setupAutocomplete(inputEl, suggestionsEl, onSelect) {
    let activeIndex = -1;

    function render(matches) {
        if (matches.length === 0) {
            suggestionsEl.innerHTML = "";
            suggestionsEl.classList.remove("open");
            return;
        }
        suggestionsEl.innerHTML = matches.map((m, i) => `
            <div class="suggestion-item" data-index="${i}" data-ticker="${m.ticker}">
                <span class="suggestion-ticker">${m.ticker}</span>
                <span class="suggestion-name">${escapeHtml(m.name)}</span>
            </div>
        `).join("");
        suggestionsEl.classList.add("open");

        suggestionsEl.querySelectorAll(".suggestion-item").forEach(item => {
            item.addEventListener("click", () => {
                const ticker = item.dataset.ticker;
                inputEl.value = ticker;
                suggestionsEl.innerHTML = "";
                suggestionsEl.classList.remove("open");
                onSelect(ticker);
            });
        });
    }

    inputEl.addEventListener("input", () => {
        const query = inputEl.value.trim().toUpperCase();
        activeIndex = -1;
        if (!query) {
            render([]);
            return;
        }
        const matches = STOCK_DIRECTORY.filter(s =>
            s.ticker.startsWith(query) || s.name.toUpperCase().includes(query)
        ).slice(0, 6);
        render(matches);
    });

    inputEl.addEventListener("keydown", (e) => {
        const items = suggestionsEl.querySelectorAll(".suggestion-item");
        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            items[activeIndex].click();
            return;
        } else {
            return;
        }

        items.forEach(i => i.classList.remove("highlighted"));
        items[activeIndex].classList.add("highlighted");
    });

    document.addEventListener("click", (e) => {
        if (!inputEl.contains(e.target) && !suggestionsEl.contains(e.target)) {
            suggestionsEl.innerHTML = "";
            suggestionsEl.classList.remove("open");
        }
    });
}

/* ---------------------------------------------------------------------
   Paper Trading — Buy / Sell
   --------------------------------------------------------------------- */

async function executeTrade(action) {
    const ticker = document.getElementById("ticker").value.trim();
    const quantity = document.getElementById("quantity").value;
    const btn = document.getElementById(action === "buy" ? "buyBtn" : "sellBtn");

    if (!ticker) {
        showToast("warning", "Please enter a stock symbol");
        return;
    }
    if (!quantity || Number(quantity) <= 0) {
        showToast("warning", "Quantity must be greater than zero");
        return;
    }

    btn.classList.add("loading");

    try {
        const { ok, data } = await apiPost(`/api/${action}`, { ticker, quantity });

        if (ok) {
            showToast("success", data.message);
        } else {
            showToast("error", data.message || "Trade failed");
        }

        await Promise.all([
            loadDashboard(),
            loadPortfolio(),
            loadTransactions(),
            loadStats(),
            loadActivity(),
        ]);
    } catch (err) {
        showToast("error", "Could not reach the trading service");
    } finally {
        btn.classList.remove("loading");
    }
}

/* ---------------------------------------------------------------------
   Portfolio (with live P&L)
   --------------------------------------------------------------------- */

async function loadPortfolio() {
    const tbody = document.querySelector("#portfolioTable tbody");
    const emptyState = document.getElementById("portfolioEmpty");

    try {
        const data = await apiGet("/api/portfolio/detailed");

        if (!data || data.length === 0) {
            tbody.innerHTML = "";
            emptyState.hidden = false;
            return;
        }

        emptyState.hidden = true;
        tbody.innerHTML = "";

        data.forEach((row, i) => {
            const pnlClass = row.pnl >= 0 ? "pnl-positive" : "pnl-negative";
            const tr = document.createElement("tr");
            tr.style.animationDelay = `${i * 40}ms`;
            tr.innerHTML = `
                <td><b>${escapeHtml(row.ticker)}</b></td>
                <td class="mono">${row.shares}</td>
                <td class="mono">${formatINR(row.avg_price)}</td>
                <td class="mono">${formatINR(row.current_price)}</td>
                <td class="mono ${pnlClass}">${formatINR(row.pnl)} (${formatPct(row.pnl_pct)})</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        // Fallback to the original lightweight endpoint if the detailed one fails
        try {
            const fallback = await apiGet("/api/portfolio");
            tbody.innerHTML = "";
            if (!fallback || fallback.length === 0) {
                emptyState.hidden = false;
                return;
            }
            emptyState.hidden = true;
            fallback.forEach(row => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><b>${escapeHtml(row[0])}</b></td>
                    <td class="mono">${row[1]}</td>
                    <td class="mono">${formatINR(row[2])}</td>
                    <td class="mono">&mdash;</td>
                    <td class="mono">&mdash;</td>
                `;
                tbody.appendChild(tr);
            });
        } catch {
            emptyState.hidden = false;
            emptyState.textContent = "Could not load portfolio.";
        }
    }
}

/* ---------------------------------------------------------------------
   Transaction History — with BUY/SELL row coloring, sort & filter
   --------------------------------------------------------------------- */

let allTransactions = [];
let activeTxnFilter = "ALL";

async function loadTransactions() {
    try {
        const data = await apiGet("/api/transactions");
        allTransactions = Array.isArray(data) ? data : [];
        renderTransactions();
    } catch (err) {
        console.error("Transactions load failed:", err);
    }
}

function renderTransactions() {
    const tbody = document.querySelector("#transactionsTable tbody");
    const emptyState = document.getElementById("transactionsEmpty");

    let rows = allTransactions;
    if (activeTxnFilter !== "ALL") {
        rows = rows.filter(r => r[0] === activeTxnFilter);
    }

    if (rows.length === 0) {
        tbody.innerHTML = "";
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    tbody.innerHTML = "";

    rows.forEach((row, i) => {
        const [type, ticker, qty, total, timestamp] = row;
        const rowClass = type === "BUY" ? "row-buy" : "row-sell";
        const pillClass = type === "BUY" ? "buy" : "sell";

        const tr = document.createElement("tr");
        tr.className = rowClass;
        tr.style.animationDelay = `${i * 30}ms`;
        tr.innerHTML = `
            <td><span class="type-pill ${pillClass}">${escapeHtml(type)}</span></td>
            <td><b>${escapeHtml(ticker)}</b></td>
            <td class="mono">${qty}</td>
            <td class="mono">${formatINR(total)}</td>
            <td class="mono">${escapeHtml(timestamp)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setupTransactionFilters() {
    document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            activeTxnFilter = chip.dataset.filter;
            renderTransactions();
        });
    });
}

/* ---------------------------------------------------------------------
   Trading Statistics
   --------------------------------------------------------------------- */

async function loadStats() {
    try {
        const data = await apiGet("/api/stats");
        document.getElementById("statTotalTrades").textContent = data.total_trades ?? 0;
        document.getElementById("statWinning").textContent = data.winning_trades ?? 0;
        document.getElementById("statLosing").textContent = data.losing_trades ?? 0;
        document.getElementById("statWinRate").textContent = `${data.win_rate ?? 0}%`;
    } catch (err) {
        console.error("Stats load failed:", err);
    }
}

/* ---------------------------------------------------------------------
   Recent Activity Feed
   --------------------------------------------------------------------- */

async function loadActivity() {
    const feed = document.getElementById("activityFeed");
    try {
        const data = await apiGet("/api/activity?limit=15");

        if (!data || data.length === 0) {
            feed.innerHTML = `<div class="empty-row">No activity yet. Start trading to see updates here.</div>`;
            return;
        }

        feed.innerHTML = "";
        data.forEach((item, i) => {
            const row = document.createElement("div");
            row.className = "activity-row";
            row.style.animationDelay = `${i * 30}ms`;
            row.innerHTML = `
                <span class="activity-dot ${escapeHtml(item.category)}"></span>
                <span>${escapeHtml(item.message)}</span>
                <span class="activity-time">${timeAgo(item.timestamp)}</span>
            `;
            feed.appendChild(row);
        });
    } catch (err) {
        feed.innerHTML = `<div class="empty-row">Could not load activity feed.</div>`;
    }
}

/* ---------------------------------------------------------------------
   Floating AI Bot — quick actions using existing endpoints
   --------------------------------------------------------------------- */

function appendBotMessage(html) {
    const messages = document.getElementById("aiBotMessages");
    const empty = messages.querySelector(".bot-message-empty");
    if (empty) empty.remove();

    const msg = document.createElement("div");
    msg.className = "bot-message";
    msg.innerHTML = html;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

async function handleBotAction(action) {
    if (action === "movers") {
        appendBotMessage("Checking today's biggest movers\u2026");
        try {
            const data = await apiGet("/api/movers");
            const top = data.gainers && data.gainers[0];
            const bottom = data.losers && data.losers[0];
            let html = "Here's what's moving today:<br>";
            html += top ? `\u2191 <b>${top.ticker}</b> ${formatPct(top.change_pct)}<br>` : "No gainers data.<br>";
            html += bottom ? `\u2193 <b>${bottom.ticker}</b> ${formatPct(bottom.change_pct)}` : "No losers data.";
            appendBotMessage(html);
        } catch {
            appendBotMessage("Couldn't fetch market movers right now.");
        }
    } else if (action === "sentiment") {
        appendBotMessage("Reading the overall market mood\u2026");
        try {
            const data = await apiGet("/api/sentiment");
            appendBotMessage(`Market sentiment is currently <b>${data.label}</b> (score ${data.score}/100) \u2014 ${data.buy} bullish, ${data.sell} bearish, ${data.hold} neutral signals.`);
        } catch {
            appendBotMessage("Couldn't fetch sentiment data right now.");
        }
    } else if (action === "bullish") {
        appendBotMessage("Scanning for bullish signals\u2026");
        try {
            const data = await apiGet("/api/assistant?tickers=RELIANCE,TCS,HDFCBANK,INFY,WIPRO,SBIN,ITC");
            const bullish = (data.insights || []).filter(i => i.signal === "BUY");
            if (bullish.length === 0) {
                appendBotMessage("No strong bullish signals across tracked stocks right now.");
            } else {
                const list = bullish.map(i => `<b>${i.ticker}</b>`).join(", ");
                appendBotMessage(`Currently bullish: ${list}`);
            }
        } catch {
            appendBotMessage("Couldn't fetch signals right now.");
        }
    } else if (action === "portfolio") {
        appendBotMessage("Pulling up your portfolio performance\u2026");
        try {
            const data = await apiGet("/api/portfolio/summary");
            const pnlWord = data.total_pnl >= 0 ? "up" : "down";
            appendBotMessage(`Your portfolio is ${pnlWord} <b>${formatINR(Math.abs(data.total_pnl))}</b> (${formatPct(data.growth_pct)}) across ${data.holdings_count} holding(s).`);
        } catch {
            appendBotMessage("Couldn't fetch your portfolio right now.");
        }
    }
}

function setupAiBot() {
    const fab = document.getElementById("aiBotFab");
    const popover = document.getElementById("aiBotPopover");
    const closeBtn = document.getElementById("aiBotClose");

    fab.addEventListener("click", () => {
        popover.classList.toggle("open");
    });

    closeBtn.addEventListener("click", () => {
        popover.classList.remove("open");
    });

    document.querySelectorAll(".bot-suggestion").forEach(btn => {
        btn.addEventListener("click", () => handleBotAction(btn.dataset.action));
    });
}

/* ---------------------------------------------------------------------
   Navigation, scrolling, sidebar toggle, quantity stepper
   --------------------------------------------------------------------- */

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            scrollToSection(link.dataset.target);

            // Close sidebar on mobile after navigating
            if (window.innerWidth <= 1000) {
                document.getElementById("sidebar").classList.remove("open");
            }
        });
    });
}

function setupSidebarToggle() {
    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
}

function setupQuantityStepper() {
    const input = document.getElementById("quantity");
    document.getElementById("qtyMinus").addEventListener("click", () => {
        input.value = Math.max(1, (Number(input.value) || 1) - 1);
    });
    document.getElementById("qtyPlus").addEventListener("click", () => {
        input.value = (Number(input.value) || 1) + 1;
    });
}

function updateMarketClock() {
    const clockEl = document.getElementById("marketClock");
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ---------------------------------------------------------------------
   Event wiring
   --------------------------------------------------------------------- */

function setupEventListeners() {
    document.getElementById("predictBtn").addEventListener("click", runPrediction);
    document.getElementById("ticker").addEventListener("keydown", (e) => {
        if (e.key === "Enter") runPrediction();
    });

    document.getElementById("watchlistAddBtn").addEventListener("click", addToWatchlist);
    document.getElementById("watchlistInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") addToWatchlist();
    });

    document.getElementById("buyBtn").addEventListener("click", () => executeTrade("buy"));
    document.getElementById("sellBtn").addEventListener("click", () => executeTrade("sell"));

    setupTransactionFilters();
    setupNavigation();
    setupSidebarToggle();
    setupQuantityStepper();
    setupAiBot();

    setupAutocomplete(
        document.getElementById("globalSearch"),
        document.getElementById("searchSuggestions"),
        (ticker) => {
            document.getElementById("ticker").value = ticker;
            scrollToSection("predict");
            runPrediction();
        }
    );

    setupAutocomplete(
        document.getElementById("ticker"),
        document.getElementById("tickerSuggestions"),
        (ticker) => runPrediction()
    );
}

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */

function init() {
    setupEventListeners();
    updateMarketClock();
    setInterval(updateMarketClock, 1000);

    loadDashboard();
    loadMarketOverview();
    loadSentiment();
    loadMovers();
    loadWatchlist();
    loadAssistant();
    loadPortfolio();
    loadTransactions();
    loadStats();
    loadActivity();
}

document.addEventListener("DOMContentLoaded", init);
