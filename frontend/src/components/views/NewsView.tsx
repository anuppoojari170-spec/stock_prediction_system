import React, { useState } from "react";
import { Newspaper, Clock } from "lucide-react";
import { NewsItem } from "../../types";

const mockNews: NewsItem[] = [
  {
    id: "news-1",
    title: "RBI Keeps Benchmark Repo Rate Steady at 6.50% in Policy Review",
    source: "Economic Times",
    timeAgo: "22m ago",
    category: "Economy",
    sentiment: "NEUTRAL",
    summary:
      "The Reserve Bank of India Monetary Policy Committee voted unanimously to maintain the repo rate at 6.50% while shifting stance to neutral, underscoring balanced inflation and resilient GDP momentum.",
    relatedTickers: ["HDFCBANK", "SBIN", "ICICIBANK"],
  },
  {
    id: "news-2",
    title: "Reliance Retail & Jio Platforms Post Record Operating Profits for Q2",
    source: "BloombergQuint",
    timeAgo: "45m ago",
    category: "Corporate",
    sentiment: "BULLISH",
    summary:
      "Reliance Industries reported a consolidated revenue growth of 8.2% YoY driven by robust 5G subscriber additions and expanded store footfalls in consumer retail verticals.",
    relatedTickers: ["RELIANCE"],
  },
  {
    id: "news-3",
    title: "Tata Consultancy Services Bags $850M Multi-Year Cloud Transformation Deal",
    source: "Reuters India",
    timeAgo: "1h ago",
    category: "Earnings",
    sentiment: "BULLISH",
    summary:
      "TCS announced an expanded partnership with a premier European financial institution to modernize enterprise core banking infrastructure with generative AI and hybrid cloud architectures.",
    relatedTickers: ["TCS"],
  },
  {
    id: "news-4",
    title: "Crude Oil Spikes Above $76/bbl Amid Geopolitical Tension in Middle East",
    source: "Mint",
    timeAgo: "2h ago",
    category: "Global",
    sentiment: "BEARISH",
    summary:
      "Brent crude climbed 2.1% on escalating shipping lane disruptions, raising concerns over domestic fuel import bills and aviation turbine fuel costs for Indian carriers.",
    relatedTickers: ["RELIANCE", "BPCL", "IOC"],
  },
  {
    id: "news-5",
    title: "Infosys Expands Enterprise Generative AI Portfolio with NVIDIA NIM Microservices",
    source: "Moneycontrol",
    timeAgo: "3h ago",
    category: "Corporate",
    sentiment: "BULLISH",
    summary:
      "Infosys Topaz integrates NVIDIA AI Enterprise software suite to deliver production-grade generative AI models for global telco and banking clients.",
    relatedTickers: ["INFY"],
  },
  {
    id: "news-6",
    title: "SEBI Mandates T+0 Settlement Framework Expansion for Top 500 Equities",
    source: "Business Standard",
    timeAgo: "4h ago",
    category: "Regulation",
    sentiment: "NEUTRAL",
    summary:
      "Market regulator SEBI announced gradual phase-in of optional same-day trade settlement across qualified brokers starting next fiscal quarter.",
    relatedTickers: ["BSE", "CDSL"],
  },
];

export const NewsView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Economy", "Corporate", "Earnings", "Global", "Regulation"];

  const filteredNews =
    selectedCategory === "All"
      ? mockNews
      : mockNews.filter((n) => n.category === selectedCategory);

  const getSentimentBadge = (sentiment: "BULLISH" | "BEARISH" | "NEUTRAL") => {
    switch (sentiment) {
      case "BULLISH":
        return "bg-[#00C087]/15 text-[#00C087] border-[#00C087]/30";
      case "BEARISH":
        return "bg-[#F04452]/15 text-[#F04452] border-[#F04452]/30";
      default:
        return "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30";
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="nexus-card p-4">
        {/* Header & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#26354B]">
          <div className="flex items-center space-x-2">
            <Newspaper size={18} className="text-[#386BFF]" />
            <h3 className="font-heading font-bold text-base text-[#F1F5FC]">
              Market News & Institutional Financial Wire
            </h3>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#386BFF] text-white"
                    : "text-[#94A3B8] hover:text-[#F1F5FC] hover:bg-[#1A2940]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* News Feed List */}
        <div className="space-y-3">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-md bg-[#0B1120] border border-[#26354B] hover:border-[#386BFF]/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1A2940] text-[#386BFF]">
                    {item.category}
                  </span>
                  <span className="text-xs text-[#94A3B8] font-medium">{item.source}</span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-xs text-[#94A3B8] flex items-center space-x-1 font-mono">
                    <Clock size={12} />
                    <span>{item.timeAgo}</span>
                  </span>
                </div>

                <span
                  className={`self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold border ${getSentimentBadge(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment}
                </span>
              </div>

              <h4 className="font-heading font-bold text-sm text-[#F1F5FC] hover:text-[#386BFF] cursor-pointer transition-colors">
                {item.title}
              </h4>

              <p className="text-xs text-[#94A3B8] leading-relaxed mt-1.5">
                {item.summary}
              </p>

              {/* Related Tickers */}
              <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-[#26354B]/50 text-xs">
                <span className="text-[#64748B] text-[11px]">Related:</span>
                {item.relatedTickers.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded bg-[#1A2940] text-[#F1F5FC] font-mono text-[10px] font-bold"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
