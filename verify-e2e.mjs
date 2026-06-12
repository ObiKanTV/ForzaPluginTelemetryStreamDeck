/**
 * End-to-end check against the RUNNING plugin process:
 *  1. GET http://127.0.0.1:3000 → expect the dashboard HTML.
 *  2. Connect a WebSocket client, send a crafted 324-byte Forza packet to
 *     UDP 5300, and expect the broadcast JSON to echo our values back.
 */
import dgram from "node:dgram";
import { WebSocket } from "ws";

const html = await (await fetch("http://127.0.0.1:3000")).text();
if (!html.includes("<title>Forza Telemetry</title>")) {
  console.error("FAIL: dashboard HTML not served");
  process.exit(1);
}
console.log("PASS: dashboard HTML served by plugin");

// Craft a packet: isRaceOn=1, rpm=4321 @16, speed=31.293 m/s (~70 mph) @256, gear=3 @319
const buf = Buffer.alloc(324);
buf.writeInt32LE(1, 0);
buf.writeFloatLE(4321, 16);
buf.writeFloatLE(31.293, 256);
buf.writeUInt8(3, 319);

const ws = new WebSocket("ws://127.0.0.1:3000");
const udp = dgram.createSocket("udp4");

const timeout = setTimeout(() => {
  console.error("FAIL: no WebSocket broadcast within 5s");
  process.exit(1);
}, 5000);

ws.on("open", () => {
  // Send a few packets in case the first lands between broadcast ticks.
  let sent = 0;
  const sender = setInterval(() => {
    udp.send(buf, 5300, "127.0.0.1");
    if (++sent >= 10) clearInterval(sender);
  }, 100);
});

ws.on("message", (raw) => {
  const d = JSON.parse(raw.toString());
  const mph = Math.round(d.speed * 2.237);
  if (d.isRaceOn === true && Math.round(d.currentEngineRpm) === 4321 && mph === 70 && d.currentGear === 3) {
    console.log(`PASS: WebSocket broadcast received (speed=${mph} mph, rpm=${Math.round(d.currentEngineRpm)}, gear=${d.currentGear})`);
    clearTimeout(timeout);
    ws.close();
    udp.close();
    process.exit(0);
  } else {
    console.error("FAIL: unexpected payload", { isRaceOn: d.isRaceOn, rpm: d.currentEngineRpm, mph, gear: d.currentGear });
    process.exit(1);
  }
});

ws.on("error", (err) => {
  console.error("FAIL: WebSocket error", err.message);
  process.exit(1);
});
