# Forza Stream Deck Plugin

A TypeScript Stream Deck plugin that displays live telemetry data from Forza Horizon 6.

Telemetry Documentation from Forza: https://support.forza.net/hc/en-us/articles/51744149102611-Forza-Horizon-6-Data-Out-Documentation

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the plugin bundle and dev tools:
   ```bash
   npm run build
   ```
   This typechecks with `tsc`, bundles the plugin into a self-contained ESM file at
   `com.kaita.forza.sdPlugin/bin/plugin.js` (no `node_modules` needed at runtime),
   and bundles the dev tools into `dist/`. Use `npm run watch` to rebuild on change.

   Note: the plugin cannot be run directly with `node` — it must be launched by the
   Stream Deck app, which passes registration arguments. Use `npm run listen` or
   `npm run ui` for quick local testing instead.

## Web Dashboard

While the plugin is installed and Stream Deck is running, the plugin itself
serves the full telemetry dashboard — just open:

```text
http://127.0.0.1:3000
```

The plugin owns the UDP socket and fans telemetry out to both the Stream Deck
keys and the browser, so both work at the same time.

`npm run ui` starts a standalone copy of the same dashboard for development
without Stream Deck — don't run it while the plugin is active, they would
conflict on ports 5300 and 3000.

To smoke-test the running plugin end-to-end (HTTP + WebSocket + UDP parsing):

```bash
npm run verify
```

## Listen To Telemetry In Terminal

1. Build and run the telemetry listener:
   ```bash
   npm run listen
   ```
2. Start driving in Forza with Data Out enabled.
3. You should see live lines such as speed, RPM, gear, and throttle.

If npm is not available yet, you can still check that UDP packets are arriving with PowerShell:

```powershell
$udp = New-Object System.Net.Sockets.UdpClient(5300)
$ep = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any,0)
while ($true) {
  $bytes = $udp.Receive([ref]$ep)
  Write-Host ("packet from {0}:{1}, bytes={2}" -f $ep.Address,$ep.Port,$bytes.Length)
}
```

## Install In Stream Deck (Windows)

1. Build the bundle:
   ```bash
   npm run build
   ```
2. Copy the folder `com.kaita.forza.sdPlugin` to:
   ```text
   %APPDATA%\Elgato\StreamDeck\Plugins\
   ```
3. Restart the Stream Deck app.
4. Add the action **Forza Telemetry** to a key and start Forza.

Tip: After code changes, rebuild and copy the `com.kaita.forza.sdPlugin` folder again, then restart Stream Deck.

## Forza Configuration

To enable telemetry in Forza Horizon 6:
1. Go to **Settings → HUD & Gameplay**
2. Find **Data Out** settings
3. Enable Data Out
4. Set IP Address to `127.0.0.1` (localhost)
5. Set Port to `5300`

## Project Structure

- `src/telemetry.ts` - Forza UDP packet parsing and listener
- `src/plugin.ts` - Stream Deck plugin entry point (owns the UDP socket, starts the dashboard)
- `src/actions/telemetry-action.ts` - The "Forza Telemetry" key action (speed + RPM)
- `src/dashboard.ts` + `src/dashboard.html` - The web dashboard server, shared by plugin and `npm run ui`
- `src/listen.ts`, `src/dump.ts`, `src/ui-server.ts` - Dev tools (terminal feed, packet dump, standalone dashboard)
- `build.mjs` - esbuild bundling (plugin → `.sdPlugin/bin/`, tools → `dist/`)
- `com.kaita.forza.sdPlugin/` - The installable plugin folder (manifest, images, bundle)

## What's Included

- **ForzaTelemetryListener** - Listens for UDP packets and parses Forza telemetry data
- **ForzaTelemetry** interface - Typed access to all telemetry fields (speed, RPM, throttle, etc.)
- **TelemetryAction** - Stream Deck key showing live speed and RPM, with
  "Waiting for Forza" / "No signal" / "Paused" states; the UDP listener only
  runs while a key is visible
- **Web dashboard** - Full telemetry view at http://127.0.0.1:3000, served by
  the plugin itself (or standalone via `npm run ui` when Stream Deck isn't running)

## Next Steps

1. Per-key settings via a Property Inspector (choose metric, mph/km/h, port)
2. Rendered key images (`setImage`) - port the dashboard's RPM gauge to the key
3. Parser unit tests using a captured packet fixture
4. Manifest polish and `.streamDeckPlugin` packaging
