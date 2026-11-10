import { useAppStore } from "../store/useAppStore";
import { IndexTick, LiveDepthData, TickerTick } from "../types";

class MarketStreamService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private reconnectInterval = 1000;
  private maxReconnectInterval = 8000;
  private isIntentionallyClosed = false;
  private activeSubscriptions = new Set<string>();

  private getUrl(): string {
    const isHttps = window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    const port = window.location.port;

    // In dev mode when Vite runs on 3000, talk directly to backend on 8000
    if (port === "3000" || port === "5173") {
      return `${protocol}//127.0.0.1:8000/ws/market/stream`;
    }
    return `${protocol}//${window.location.host}/ws/market/stream`;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    const store = useAppStore.getState();
    store.setWsStatus("connecting");

    try {
      const url = this.getUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        useAppStore.getState().setWsStatus("connected");
        this.reconnectInterval = 1000;

        // Restore any active subscriptions or subscribe to active ticker
        const currentActive = useAppStore.getState().activeTicker;
        if (currentActive) {
          this.subscribe([currentActive]);
          this.requestDepth(currentActive);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type;
          const currentStore = useAppStore.getState();

          switch (type) {
            case "SNAPSHOT":
              if (msg.data) {
                currentStore.applySnapshot(msg.data);
              }
              break;

            case "TICK":
              if (msg.data) {
                currentStore.applyTick(msg.data as TickerTick);
              }
              break;

            case "INDEX_TICK":
              if (msg.data) {
                currentStore.applyIndexTick(msg.data as IndexTick);
              }
              break;

            case "DEPTH":
              if (msg.data) {
                currentStore.applyDepth(msg.data as LiveDepthData);
              }
              break;

            case "PONG":
            case "HEARTBEAT":
              break;

            default:
              break;
          }
        } catch (e) {
          console.error("Failed to parse market stream message:", e);
        }
      };

      this.ws.onerror = () => {
        useAppStore.getState().setWsStatus("disconnected");
      };

      this.ws.onclose = () => {
        useAppStore.getState().setWsStatus("disconnected");
        this.ws = null;
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      useAppStore.getState().setWsStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, this.maxReconnectInterval);
      this.connect();
    }, this.reconnectInterval);
  }

  public subscribe(tickers: string[]) {
    if (!tickers || tickers.length === 0) return;
    tickers.forEach((t) => this.activeSubscriptions.add(t.toUpperCase()));

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          action: "subscribe",
          tickers: tickers.map((t) => t.toUpperCase()),
        })
      );
    }
  }

  public requestDepth(ticker: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          action: "get_depth",
          ticker: ticker.toUpperCase(),
        })
      );
    }
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useAppStore.getState().setWsStatus("disconnected");
  }
}

export const marketStreamService = new MarketStreamService();

