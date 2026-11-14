import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Clock, RefreshCw } from "lucide-react";
import { NewsItem } from "../../types";
import { marketApi } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import { CirclingLoader } from "../common/CirclingLoader";

const fallbackNews: NewsItem[] = [
  {
    id: "fb-1",
    title: "RBI Keeps Benchmark Repo Rate Steady at 6.50% in Policy Review",
    source: "Economic Times",
    timeAgo: "25m ago",
    category: "Economy",
    sentiment: "NEUTRAL",
    summary:
      "The Reserve Bank of India Monetary Policy Committee voted to maintain the repo rate while shifting stance to neutral, underscoring balanced inflation and resilient GDP momentum.",
    relatedTickers: ["HDFCBANK", "SBIN", "ICICIBANK"],
  },
  {
    id: "fb-2",
    title: "Reliance Retail & Jio Platforms Post Steady Margin Growth Across Verticals",
    source: "Mint",
    timeAgo: "45m ago",
    category: "Corporate",
    sentiment: "BULLISH",
    summary:
      "Reliance Industries reported consolidated growth driven by robust 5G subscriber additions and expanded store footfalls in retail verticals.",
    relatedTickers: ["RELIANCE"],
  },
  {
    id: "fb-3",
    title: "Tata Consultancy Services and Indian IT Majors Bag Cloud Transformation Deals",
    source: "Reuters India",
    timeAgo: "1h ago",
    category: "Earnings",
    sentiment: "BULLISH",
    summary:
      "Indian IT leaders announced expanded partnerships with premier European and US institutions to modernize enterprise infrastructure with generative AI and hybrid cloud.",
    relatedTickers: ["TCS", "INFY"],
  },
];

export const NewsView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { setActiveTicker, setActiveTab } = useAppStore();

  const categories = ["All", "Economy", "Corporate", "Earnings", "Global", "Regulation"];

  const { data: newsItems, isLoading, refetch } = useQuery<NewsItem[]>({
    queryKey: ["liveMarketNewsFeed"],
    queryFn: () => marketApi.getNews(15),
    refetchInterval: 60000,
  });

  const allNews = newsItems && newsItems.length > 0 ? newsItems : fallbackNews;

  const filteredNews =
    selectedCategory === "All"
      ? allNews
      : allNews.filter((n) => n.category === selectedCategory);


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
            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#00C087]/15 text-[#00C087] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C087] animate-pulse"></span>
              <span>LIVE FEED</span>
            </span>
            <button
              onClick={() => refetch()}
              className="p-1 text-[#94A3B8] hover:text-[#386BFF] transition-colors"
              title="Refresh News Feed"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
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
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <CirclingLoader size="md" label="Loading real-time news wire..." />
            </div>
          ) : (
            filteredNews.map((item) => (
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

              <h4
                onClick={() => {
                  if (item.relatedTickers && item.relatedTickers.length > 0) {
                    setActiveTicker(item.relatedTickers[0]);
                    setActiveTab("overview");
                  }
                }}
                className="font-heading font-bold text-sm text-[#F1F5FC] hover:text-[#386BFF] cursor-pointer transition-colors"
              >
                {item.title}
              </h4>

              <p className="text-xs text-[#94A3B8] leading-relaxed mt-1.5">
                {item.summary}
              </p>

              {/* Related Tickers */}
              <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-[#26354B]/50 text-xs">
                <span className="text-[#64748B] text-[11px]">Related:</span>
                {item.relatedTickers.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setActiveTicker(t);
                      setActiveTab("overview");
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#1A2940] hover:bg-[#386BFF] text-[#F1F5FC] font-mono text-[10px] font-bold transition-colors cursor-pointer"
                    title={`View ${t} in Terminal`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
};
