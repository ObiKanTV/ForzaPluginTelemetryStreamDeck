# Forza Stream Deck Plugin

A TypeScript Stream Deck plugin that displays live telemetry data from Forza Horizon 6.

Telemetry Documentation from Forza: https://support.forza.net/hc/en-us/articles/51744149102611-Forza-Horizon-6-Data-Out-Documentation

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the plugin bundle:
   ```bash
   npm run build
   ```

3. Start the plugin directly (quick local runtime test):
   ```bash
   npm run dev
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
- `src/plugin.ts` - Stream Deck plugin main entry point
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

## What's Included

- **ForzaTelemetryListener** - Listens for UDP packets and parses Forza telemetry data
- **ForzaTelemetry** interface - Typed access to all telemetry fields (speed, RPM, throttle, etc.)
- Basic Stream Deck plugin structure ready for custom actions

## Next Steps

1. Define your custom Stream Deck action in a plugin manifest
2. Create action handlers that consume the telemetry data
3. Update the Stream Deck keys with formatted telemetry displays
