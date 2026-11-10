import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { marketStreamService } from "../services/websocket";

export function useMarketStream() {
  const activeTicker = useAppStore((state) => state.activeTicker);
  const wsStatus = useAppStore((state) => state.wsStatus);
  const liveTicks = useAppStore((state) => state.liveTicks);
  const liveIndices = useAppStore((state) => state.liveIndices);
  const liveDepth = useAppStore((state) => state.liveDepth);

  // Initialize and connect on mount
  useEffect(() => {
    marketStreamService.connect();

    const handleFocus = () => {
      marketStreamService.connect();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // When active ticker changes, subscribe and fetch depth
  useEffect(() => {
    if (activeTicker) {
      marketStreamService.subscribe([activeTicker]);
      marketStreamService.requestDepth(activeTicker);
    }
  }, [activeTicker]);

  return {
    wsStatus,
    liveTicks,
    liveIndices,
    liveDepth,
    activeTick: liveTicks[activeTicker.toUpperCase()],
    activeDepth: liveDepth[activeTicker.toUpperCase()],
  };
}

