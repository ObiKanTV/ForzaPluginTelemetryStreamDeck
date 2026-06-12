import {
  action,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import { ForzaTelemetry, ForzaTelemetryListener } from "../telemetry";

const REFRESH_MS = 250; // key redraw rate (~4 Hz; Forza sends 60 Hz)
const STALE_MS = 2000; // no packet for this long → "No signal"

/**
 * Shows live speed and RPM on a key. The telemetry listener is owned by the
 * plugin entry point (it is shared with the dashboard); this action only
 * runs its render timer while at least one instance is visible.
 */
@action({ UUID: "com.kaita.forza.telemetry" })
export class TelemetryAction extends SingletonAction {
  private timer?: NodeJS.Timeout;
  private latest?: ForzaTelemetry;
  private lastPacketAt = 0;
  private lastTitles = new Map<string, string>();
  private socketError?: string;

  constructor(telemetry: ForzaTelemetryListener) {
    super();
    telemetry.onTelemetry((data) => {
      this.latest = data;
      this.lastPacketAt = Date.now();
      this.socketError = undefined;
    });
    telemetry.onError((err) => {
      this.socketError = err.message.includes("EADDRINUSE")
        ? "Port 5300\nin use"
        : "Socket\nerror";
    });
  }

  override onWillAppear(ev: WillAppearEvent): void {
    this.timer ??= setInterval(() => this.render(), REFRESH_MS);
    if (ev.action.isKey()) {
      void ev.action.setTitle(this.currentTitle());
    }
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    this.lastTitles.delete(ev.action.id);
    // The visible-actions store may still include this instance while the
    // event is being dispatched, so re-check on the next tick.
    setImmediate(() => {
      if (this.actions.length === 0) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    });
  }

  private render(): void {
    const title = this.currentTitle();
    for (const visible of this.actions) {
      if (!visible.isKey()) continue;
      if (this.lastTitles.get(visible.id) === title) continue;
      this.lastTitles.set(visible.id, title);
      void visible.setTitle(title);
    }
  }

  private currentTitle(): string {
    if (this.socketError) return this.socketError;
    if (!this.latest) return "Waiting\nfor Forza";
    if (Date.now() - this.lastPacketAt > STALE_MS) return "No\nsignal";
    if (!this.latest.isRaceOn) return "Paused";

    const mph = Math.round(this.latest.speed * 2.237);
    const rpm = Math.round(this.latest.currentEngineRpm);
    return `${mph} mph\n${rpm} RPM`;
  }
}
