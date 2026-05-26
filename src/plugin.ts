import { streamDeck } from "@elgato/streamdeck";
import { ForzaTelemetryListener } from "./telemetry";

const TELEMETRY_ACTION_UUID = "com.kaita.forza.telemetry";

class ForzaPlugin {
  private telemetry: ForzaTelemetryListener;

  constructor() {
    this.telemetry = new ForzaTelemetryListener(5300, "127.0.0.1");
  }

  async initialize(): Promise<void> {
    console.log("Initializing Forza Stream Deck plugin...");

    // Start listening for telemetry
    this.telemetry.start();

    // Listen for telemetry updates
    this.telemetry.onTelemetry((data) => {
      this.updateDisplay(data);
    });

    // Register key handlers
    streamDeck.actions.onKeyDown((event: any) => {
      const action = String(event.action);
      if (action !== TELEMETRY_ACTION_UUID) {
        return;
      }
      console.log(`Key pressed: ${action}`);
    });

    streamDeck.actions.onKeyUp((event: any) => {
      const action = String(event.action);
      if (action !== TELEMETRY_ACTION_UUID) {
        return;
      }
      console.log(`Key released: ${action}`);
    });
  }

  private updateDisplay(data: any): void {
    // Convert m/s to mph
    const speedMph = Math.round(data.speed * 2.237);

    const displayText = `${speedMph} mph\n${Math.round(
      data.currentEngineRpm
    )} RPM`;

    console.log(displayText);

    // TODO: Update Stream Deck key with this text
    // Once you register your first action in the plugin manifest,
    // you can update it here
  }
}

const plugin = new ForzaPlugin();
plugin
  .initialize()
  .then(() => {
    // Connect to the Stream Deck host after handlers are ready.
    streamDeck.connect();
  })
  .catch(console.error);
