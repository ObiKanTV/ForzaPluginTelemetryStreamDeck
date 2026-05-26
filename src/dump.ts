/**
 * Captures a single UDP packet from Forza and writes a full byte-level
 * interpretation to telemetry-dump.txt so we can verify the packet layout.
 *
 * Run: npm run dump
 * Then drive/rev in-game for a moment and check telemetry-dump.txt
 */
import dgram from "dgram";
import fs from "fs";
import path from "path";

const PORT = 5300;
const HOST = "0.0.0.0"; // listen on all interfaces
const OUT_FILE = path.join(process.cwd(), "telemetry-dump.txt");
const CAPTURE_COUNT = 3; // capture this many packets then exit

let captured = 0;
const lines: string[] = [];

function hexByte(n: number) {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

function dumpPacket(buf: Buffer, index: number) {
  lines.push(`${"=".repeat(72)}`);
  lines.push(`PACKET #${index + 1}  (${buf.length} bytes)`);
  lines.push(`${"=".repeat(72)}`);
  lines.push("");

  // Raw hex dump (16 bytes per row)
  lines.push("── RAW HEX ──────────────────────────────────────────────────────────");
  for (let i = 0; i < buf.length; i += 16) {
    const chunk = buf.slice(i, i + 16);
    const hex = Array.from(chunk).map(hexByte).join(" ").padEnd(47);
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`  ${String(i).padStart(4, "0")}  ${hex}  ${ascii}`);
  }
  lines.push("");

  // Per-4-byte offset table
  lines.push("── OFFSET TABLE (every 4 bytes) ─────────────────────────────────────");
  lines.push(
    "  offset | bytes (hex)      | as float32       | as int32       | as uint32      | uint8[0..3]"
  );
  lines.push("  " + "-".repeat(95));

  for (let off = 0; off + 3 < buf.length; off += 4) {
    const b0 = buf[off], b1 = buf[off + 1], b2 = buf[off + 2], b3 = buf[off + 3];
    const hexStr = `${hexByte(b0)} ${hexByte(b1)} ${hexByte(b2)} ${hexByte(b3)}`;
    const f32 = buf.readFloatLE(off).toPrecision(7);
    const i32 = buf.readInt32LE(off);
    const u32 = buf.readUInt32LE(off);
    const bytes = `${b0},${b1},${b2},${b3}`;

    lines.push(
      `  ${String(off).padStart(6)} | ${hexStr.padEnd(16)} | ${f32.padEnd(16)} | ${String(i32).padEnd(14)} | ${String(u32).padEnd(14)} | ${bytes}`
    );
  }

  // Also dump individual uint8 values at every byte offset
  lines.push("");
  lines.push("── UINT8 AT EVERY BYTE ──────────────────────────────────────────────");
  const u8cols = 16;
  for (let i = 0; i < buf.length; i += u8cols) {
    const vals = [];
    for (let j = 0; j < u8cols && i + j < buf.length; j++) {
      vals.push(`${String(i + j).padStart(3)}=${String(buf[i + j]).padStart(3)}`);
    }
    lines.push("  " + vals.join("  "));
  }

  lines.push("");
}

const server = dgram.createSocket("udp4");

server.on("message", (msg) => {
  if (captured >= CAPTURE_COUNT) return;
  console.log(`Captured packet #${captured + 1} (${msg.length} bytes)`);
  dumpPacket(msg, captured);
  captured++;

  if (captured >= CAPTURE_COUNT) {
    server.close();
    fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
    console.log(`\nDump written to: ${OUT_FILE}`);
    process.exit(0);
  }
});

server.bind(PORT, HOST, () => {
  console.log(`Listening for Forza UDP on ${HOST}:${PORT}`);
  console.log(`Will capture ${CAPTURE_COUNT} packets then write ${OUT_FILE}`);
  console.log("Go in-game and drive/rev the engine...\n");
});
