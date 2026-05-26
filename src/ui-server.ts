import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { ForzaTelemetryListener, ForzaTelemetry } from "./telemetry";

const UI_PORT = 3000;
const TELEMETRY_PORT = 5300;

// ── Inline HTML dashboard ──────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Forza Telemetry</title>
<style>
  :root {
    --bg: #0d0d0d;
    --card: #161616;
    --border: #2a2a2a;
    --accent: #e8a020;
    --green: #3ecf60;
    --red: #e85050;
    --text: #f0f0f0;
    --muted: #888;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    padding: 16px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  header h1 { font-size: 18px; font-weight: 600; }
  #status {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 20px;
    background: #333;
    color: var(--muted);
  }
  #status.live { background: #1a3a20; color: var(--green); }
  #status.disconnected { background: #3a1a1a; color: var(--red); }

  /* Hero row */
  .hero {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .hero-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
    text-align: center;
  }
  .hero-card .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .hero-card .value { font-size: 32px; font-weight: 700; color: var(--accent); line-height: 1.1; margin: 4px 0 2px; }
  .hero-card .unit  { font-size: 11px; color: var(--muted); }

  /* Bar */
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .bar-label { width: 64px; font-size: 12px; color: var(--muted); }
  .bar-track { flex: 1; height: 8px; background: #222; border-radius: 4px; overflow: hidden; }
  .bar-fill  { height: 100%; border-radius: 4px; transition: width .1s; }
  .bar-fill.throttle { background: var(--green); }
  .bar-fill.brake    { background: var(--red); }
  .bar-fill.clutch   { background: #6090e8; }
  .bar-fill.handbrake{ background: var(--accent); }
  .bar-pct   { width: 36px; text-align: right; font-size: 12px; }

  /* Grid of stat cards */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
  }
  .card h2 { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
  .stat-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #1e1e1e; }
  .stat-row:last-child { border-bottom: none; }
  .stat-key   { color: var(--muted); font-size: 12px; }
  .stat-value { font-size: 12px; font-weight: 600; }

  /* Tire grid */
  .tire-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .tire-cell { background: #1c1c1c; border-radius: 6px; padding: 8px; text-align: center; }
  .tire-cell .pos  { font-size: 10px; color: var(--muted); }
  .tire-cell .temp { font-size: 16px; font-weight: 700; }
  .tire-cell .slip { font-size: 11px; color: var(--muted); margin-top: 2px; }

  .controls-section { margin-bottom: 14px; }
  .controls-section h2 { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
</style>
</head>
<body>

<header>
  <h1>Forza Telemetry</h1>
  <span id="status">Connecting…</span>
</header>

<!-- Hero stats -->
<div class="hero">
  <div class="hero-card">
    <div class="label">Speed</div>
    <div class="value" id="h-speed">—</div>
    <div class="unit">mph</div>
  </div>
  <div class="hero-card">
    <div class="label">RPM</div>
    <div class="value" id="h-rpm">—</div>
    <div class="unit">/ <span id="h-maxrpm">—</span></div>
  </div>
  <div class="hero-card">
    <div class="label">Gear</div>
    <div class="value" id="h-gear">—</div>
    <div class="unit">&nbsp;</div>
  </div>
  <div class="hero-card">
    <div class="label">Position</div>
    <div class="value" id="h-pos">—</div>
    <div class="unit">Lap <span id="h-lap">—</span></div>
  </div>
</div>

<!-- Controls bars -->
<div class="controls-section">
  <h2>Controls</h2>
  <div class="bar-row">
    <span class="bar-label">Throttle</span>
    <div class="bar-track"><div class="bar-fill throttle" id="b-throttle" style="width:0%"></div></div>
    <span class="bar-pct" id="p-throttle">0%</span>
  </div>
  <div class="bar-row">
    <span class="bar-label">Brake</span>
    <div class="bar-track"><div class="bar-fill brake" id="b-brake" style="width:0%"></div></div>
    <span class="bar-pct" id="p-brake">0%</span>
  </div>
  <div class="bar-row">
    <span class="bar-label">Clutch</span>
    <div class="bar-track"><div class="bar-fill clutch" id="b-clutch" style="width:0%"></div></div>
    <span class="bar-pct" id="p-clutch">0%</span>
  </div>
  <div class="bar-row">
    <span class="bar-label">Handbrake</span>
    <div class="bar-track"><div class="bar-fill handbrake" id="b-handbrake" style="width:0%"></div></div>
    <span class="bar-pct" id="p-handbrake">0%</span>
  </div>
</div>

<!-- Detail cards -->
<div class="grid">

  <!-- Engine -->
  <div class="card">
    <h2>Engine</h2>
    <div class="stat-row"><span class="stat-key">Current RPM</span><span class="stat-value" id="s-rpm">—</span></div>
    <div class="stat-row"><span class="stat-key">Max RPM</span><span class="stat-value" id="s-maxrpm">—</span></div>
    <div class="stat-row"><span class="stat-key">Idle RPM</span><span class="stat-value" id="s-idlerpm">—</span></div>
    <div class="stat-row"><span class="stat-key">Power</span><span class="stat-value" id="s-power">—</span></div>
    <div class="stat-row"><span class="stat-key">Torque</span><span class="stat-value" id="s-torque">—</span></div>
    <div class="stat-row"><span class="stat-key">Boost</span><span class="stat-value" id="s-boost">—</span></div>
    <div class="stat-row"><span class="stat-key">Fuel</span><span class="stat-value" id="s-fuel">—</span></div>
  </div>

  <!-- Lap / Race -->
  <div class="card">
    <h2>Race</h2>
    <div class="stat-row"><span class="stat-key">Lap</span><span class="stat-value" id="s-lap">—</span></div>
    <div class="stat-row"><span class="stat-key">Position</span><span class="stat-value" id="s-pos">—</span></div>
    <div class="stat-row"><span class="stat-key">Current Lap</span><span class="stat-value" id="s-laptime">—</span></div>
    <div class="stat-row"><span class="stat-key">Last Lap</span><span class="stat-value" id="s-lastlap">—</span></div>
    <div class="stat-row"><span class="stat-key">Best Lap</span><span class="stat-value" id="s-bestlap">—</span></div>
    <div class="stat-row"><span class="stat-key">Race Time</span><span class="stat-value" id="s-racetime">—</span></div>
    <div class="stat-row"><span class="stat-key">Distance</span><span class="stat-value" id="s-dist">—</span></div>
  </div>

  <!-- Car Info -->
  <div class="card">
    <h2>Car</h2>
    <div class="stat-row"><span class="stat-key">Class</span><span class="stat-value" id="s-class">—</span></div>
    <div class="stat-row"><span class="stat-key">PI</span><span class="stat-value" id="s-pi">—</span></div>
    <div class="stat-row"><span class="stat-key">Drivetrain</span><span class="stat-value" id="s-drive">—</span></div>
    <div class="stat-row"><span class="stat-key">Cylinders</span><span class="stat-value" id="s-cyl">—</span></div>
    <div class="stat-row"><span class="stat-key">Steer</span><span class="stat-value" id="s-steer">—</span></div>
  </div>

  <!-- Motion -->
  <div class="card">
    <h2>Motion</h2>
    <div class="stat-row"><span class="stat-key">Yaw</span><span class="stat-value" id="s-yaw">—</span></div>
    <div class="stat-row"><span class="stat-key">Pitch</span><span class="stat-value" id="s-pitch">—</span></div>
    <div class="stat-row"><span class="stat-key">Roll</span><span class="stat-value" id="s-roll">—</span></div>
    <div class="stat-row"><span class="stat-key">Accel X</span><span class="stat-value" id="s-ax">—</span></div>
    <div class="stat-row"><span class="stat-key">Accel Y</span><span class="stat-value" id="s-ay">—</span></div>
    <div class="stat-row"><span class="stat-key">Accel Z</span><span class="stat-value" id="s-az">—</span></div>
  </div>

  <!-- Suspension -->
  <div class="card">
    <h2>Suspension (m)</h2>
    <div class="tire-grid">
      <div class="tire-cell"><div class="pos">FL</div><div class="temp" id="susp-fl">—</div></div>
      <div class="tire-cell"><div class="pos">FR</div><div class="temp" id="susp-fr">—</div></div>
      <div class="tire-cell"><div class="pos">RL</div><div class="temp" id="susp-rl">—</div></div>
      <div class="tire-cell"><div class="pos">RR</div><div class="temp" id="susp-rr">—</div></div>
    </div>
  </div>

  <!-- Tire Temps -->
  <div class="card">
    <h2>Tire Temps (°C)</h2>
    <div class="tire-grid">
      <div class="tire-cell"><div class="pos">FL</div><div class="temp" id="tt-fl">—</div><div class="slip" id="ts-fl">slip —</div></div>
      <div class="tire-cell"><div class="pos">FR</div><div class="temp" id="tt-fr">—</div><div class="slip" id="ts-fr">slip —</div></div>
      <div class="tire-cell"><div class="pos">RL</div><div class="temp" id="tt-rl">—</div><div class="slip" id="ts-rl">slip —</div></div>
      <div class="tire-cell"><div class="pos">RR</div><div class="temp" id="tt-rr">—</div><div class="slip" id="ts-rr">slip —</div></div>
    </div>
  </div>

</div>

<script>
  const CAR_CLASSES = ['D', 'C', 'B', 'A', 'S1', 'S2', 'X', 'Trucks'];
  const DRIVETRAINS = ['FWD', 'RWD', 'AWD'];

  function fmt(n, digits = 0) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(digits);
  }
  function fmtTime(s) {
    if (s == null || s <= 0) return '—';
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(3).padStart(6, '0');
    return m + ':' + sec;
  }
  function pct(v255) { return Math.round(v255 / 255 * 100); }
  function setBar(id, pid, v255) {
    const p = pct(v255);
    document.getElementById('b-' + id).style.width = p + '%';
    document.getElementById('p-' + pid).textContent = p + '%';
  }
  function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  const status = document.getElementById('status');

  function connect() {
    const ws = new WebSocket('ws://' + location.host);

    ws.onopen = () => {
      status.textContent = 'Live';
      status.className = 'live';
    };

    ws.onclose = () => {
      status.textContent = 'Disconnected';
      status.className = 'disconnected';
      setTimeout(connect, 2000);
    };

    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);

      const speedMph = Math.round(d.speed * 2.237);
      const gear = d.currentGear === 0 ? 'N' : String(d.currentGear);

      // Hero
      set('h-speed', speedMph);
      set('h-rpm',   Math.round(d.currentEngineRpm));
      set('h-maxrpm', Math.round(d.engineMaxRpm));
      set('h-gear',   gear);
      set('h-pos',    d.racePosition || '—');
      set('h-lap',    d.lap || '—');

      // Bars
      setBar('throttle', 'throttle', d.accel);
      setBar('brake',    'brake',    d.brake);
      setBar('clutch',   'clutch',   d.clutch);
      setBar('handbrake','handbrake',d.handBrake);

      // Engine
      set('s-rpm',    Math.round(d.currentEngineRpm));
      set('s-maxrpm', Math.round(d.engineMaxRpm));
      set('s-idlerpm',Math.round(d.engineIdleRpm));
      set('s-power',  Math.round(d.power / 1000) + ' kW');
      set('s-torque', fmt(d.torque, 1) + ' N·m');
      set('s-boost',  fmt(d.boost, 2) + ' PSI');
      set('s-fuel',   Math.round(d.fuel * 100) + '%');

      // Race
      set('s-lap',     d.lap);
      set('s-pos',     d.racePosition);
      set('s-laptime', fmtTime(d.currentLapTime));
      set('s-lastlap', fmtTime(d.lastLapTime));
      set('s-bestlap', fmtTime(d.bestLapTime));
      set('s-racetime',fmtTime(d.currentRaceTime));
      set('s-dist',    fmt(d.distanceTraveled, 0) + ' m');

      // Car
      set('s-class', CAR_CLASSES[d.carClass] ?? '—');
      set('s-pi',    d.carPI);
      set('s-drive', DRIVETRAINS[d.drivetrainType] ?? '—');
      set('s-cyl',   d.numCylinders);
      set('s-steer', d.steer);

      // Motion
      set('s-yaw',  fmt(d.yaw,  3));
      set('s-pitch',fmt(d.pitch,3));
      set('s-roll', fmt(d.roll, 3));
      set('s-ax',   fmt(d.accelX, 2) + ' m/s²');
      set('s-ay',   fmt(d.accelY, 2) + ' m/s²');
      set('s-az',   fmt(d.accelZ, 2) + ' m/s²');

      // Suspension
      set('susp-fl', fmt(d.suspTravelFl, 3));
      set('susp-fr', fmt(d.suspTravelFr, 3));
      set('susp-rl', fmt(d.suspTravelRl, 3));
      set('susp-rr', fmt(d.suspTravelRr, 3));

      // Tire temps + slip
      for (const [id, tk, sk] of [
        ['fl','tireTempFl','tireSlipRatioFl'],
        ['fr','tireTempFr','tireSlipRatioFr'],
        ['rl','tireTempRl','tireSlipRatioRl'],
        ['rr','tireTempRr','tireSlipRatioRr'],
      ]) {
        set('tt-' + id, fmt(d[tk], 1) + '°');
        set('ts-' + id, 'slip ' + fmt(d[sk], 3));
      }
    };
  }

  connect();
</script>
</body>
</html>`;

// ── Server ─────────────────────────────────────────────────────────────────────
const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML);
});

const wss = new WebSocketServer({ server: httpServer });
const telemetry = new ForzaTelemetryListener(TELEMETRY_PORT, "127.0.0.1");

let latest: ForzaTelemetry | null = null;

telemetry.onTelemetry((data) => {
  latest = data;
});

// Broadcast at ~20 Hz regardless of how fast UDP packets arrive
setInterval(() => {
  if (!latest) return;
  const payload = JSON.stringify(latest);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}, 50);

httpServer.listen(UI_PORT, "127.0.0.1", () => {
  console.log(`Forza Telemetry UI → http://127.0.0.1:${UI_PORT}`);
});

telemetry.start();
