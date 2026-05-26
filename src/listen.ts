import { ForzaTelemetryListener } from "./telemetry";

const listener = new ForzaTelemetryListener(5300, "127.0.0.1");
let lastPrint = 0;

console.log("Waiting for Forza telemetry on 127.0.0.1:5300");
console.log("Press Ctrl+C to stop.\n");

listener.onTelemetry((data) => {
  const now = Date.now();
  if (now - lastPrint < 200) {
    return;
  }

  lastPrint = now;

  const speedMph = Math.round(data.speed * 2.237);
  const rpm = Math.round(data.currentEngineRpm);
  const gear = data.currentGear === 0 ? "N" : String(data.currentGear);
  const throttlePct = Math.round((data.accel / 255) * 100);
  const brakePct = Math.round((data.brake / 255) * 100);
  const fuelPct = Math.round(data.fuel * 100);

  const line = [
    `speed=${speedMph} mph`,
    `rpm=${rpm}`,
    `gear=${gear}`,
    `throttle=${throttlePct}%`,
    `brake=${brakePct}%`,
    `fuel=${fuelPct}%`,
  ].join(" | ");

  console.log(line);
});

listener.start();
