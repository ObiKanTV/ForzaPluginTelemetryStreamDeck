import streamDeck from "@elgato/streamdeck";
import { TelemetryAction } from "./actions/telemetry-action";
import { DashboardServer } from "./dashboard";
import { ForzaTelemetryListener } from "./telemetry";

const SOCKET_RETRY_MS = 5000;

// One process owns the UDP port: the plugin receives telemetry and fans it
// out to both the Stream Deck keys and the browser dashboard.
const telemetry = new ForzaTelemetryListener(5300, "127.0.0.1");
const dashboard = new DashboardServer(3000, "127.0.0.1", (msg) => streamDeck.logger.info(msg));

dashboard.attach(telemetry);
streamDeck.actions.registerAction(new TelemetryAction(telemetry));

// If the port is taken (e.g. the standalone dev dashboard), keep retrying so
// the plugin recovers once it is released, without needing a restart.
telemetry.onError((err) => {
  streamDeck.logger.error(`Telemetry socket error: ${err.message}; retrying in ${SOCKET_RETRY_MS} ms`);
  setTimeout(() => telemetry.start(), SOCKET_RETRY_MS);
});

void streamDeck.connect().then(() => {
  telemetry.start();
  dashboard.start((err) => {
    streamDeck.logger.error(`Dashboard server error: ${err.message}`);
  });
});
