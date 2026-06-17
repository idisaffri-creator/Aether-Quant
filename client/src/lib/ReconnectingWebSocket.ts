/**
 * Reconnecting WebSocket — auto-reconnect with exponential backoff.
 *
 * Usage:
 *   const ws = new ReconnectingWebSocket("wss://host/ws");
 *   const unsub = ws.subscribe((msg) => { ... });
 *   ws.connect();
 */
export type WSMessageHandler = (data: any) => void;

export class ReconnectingWebSocket {
  private url: string;
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private maxRetries = 20;
  private baseDelay = 1000; // 1s
  private maxDelay = 30000; // 30s
  private listeners: Set<WSMessageHandler> = new Set();
  private statusListeners: Set<(status: "connecting" | "open" | "closed") => void> = new Set();
  private manualClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: "connecting" | "open" | "closed" = "closed";

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.manualClose = false;
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.retryCount = 0;
      this.setStatus("open");
    };
    this.ws.onclose = () => {
      this.setStatus("closed");
      if (!this.manualClose) this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      this.ws?.close();
    };
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.listeners.forEach(l => {
          try { l(data); } catch { /* ignore handler errors */ }
        });
      } catch {
        // ignore non-JSON
      }
    };
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }

  close() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.setStatus("closed");
  }

  subscribe(handler: WSMessageHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  onStatus(handler: (status: "connecting" | "open" | "closed") => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => this.statusListeners.delete(handler);
  }

  private setStatus(status: "connecting" | "open" | "closed") {
    this.status = status;
    this.statusListeners.forEach(l => {
      try { l(status); } catch { /* ignore */ }
    });
  }

  private scheduleReconnect() {
    if (this.manualClose) return;
    if (this.retryCount >= this.maxRetries) {
      this.setStatus("closed");
      return;
    }
    // Exponential backoff with jitter
    const delay = Math.min(
      this.maxDelay,
      this.baseDelay * Math.pow(2, this.retryCount) + Math.random() * 500,
    );
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
