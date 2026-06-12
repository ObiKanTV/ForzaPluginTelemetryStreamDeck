/**
 * Standalone dashboard for development without the Stream Deck app.
 *
 * NB: The installed plugin serves the same dashboard on the same port while
 * Stream Deck is running — in that case just open the URL; running this too
 * would conflict on both the UDP and HTTP ports.
 */
import { DashboardServer } from "./dashboard";
import { ForzaTelemetryListener } from "./telemetry";

const telemetry = new ForzaTelemetryListener(5300, "127.0.0.1");
const dashboard = new DashboardServer(3000, "127.0.0.1");

dashboard.attach(telemetry);

telemetry.onError((err) => {
  console.error(`Telemetry socket error: ${err.message}`);
  console.error("Is the Stream Deck plugin already listening? Open the dashboard it serves instead.");
  process.exit(1);
});

dashboard.start((err) => {
  console.error(`Dashboard server error: ${err.message}`);
  process.exit(1);
});

telemetry.start();
