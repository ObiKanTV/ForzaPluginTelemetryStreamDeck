import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import HTML from "./dashboard.html";
import { ForzaTelemetry, ForzaTelemetryListener } from "./telemetry";

const BROADCAST_MS = 50; // ~20 Hz to the browser regardless of UDP rate

/**
 * Serves the telemetry dashboard (HTTP + WebSocket) from an existing
 * telemetry listener, so a single process owns the UDP port.
 */
export class DashboardServer {
  private httpServer?: http.Server;
  private wss?: WebSocketServer;
  private timer?: NodeJS.Timeout;
  private latest: ForzaTelemetry | null = null;

  constructor(
    private port: number = 3000,
    private host: string = "127.0.0.1",
    private log: (msg: string) => void = console.log,
  ) {}

  get url(): string {
    return `http://${this.host}:${this.port}`;
  }

  attach(telemetry: ForzaTelemetryListener): void {
    telemetry.onTelemetry((data) => {
      this.latest = data;
    });
  }

  start(onError?: (err: Error) => void): void {
    if (this.httpServer) return;

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(HTML);
    });
    this.httpServer = server;

    server.on("error", (err: Error) => {
      this.stop();
      onError?.(err);
    });

    this.wss = new WebSocketServer({ server });

    this.timer = setInterval(() => {
      if (!this.latest || !this.wss || this.wss.clients.size === 0) return;
      const payload = JSON.stringify(this.latest);
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }, BROADCAST_MS);

    server.listen(this.port, this.host, () => {
      this.log(`Forza Telemetry dashboard → ${this.url}`);
    });
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.wss?.close();
    this.wss = undefined;
    this.httpServer?.close();
    this.httpServer = undefined;
  }
}
