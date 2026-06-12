/**
 * Builds the Stream Deck plugin bundle and the standalone dev tools.
 *
 *   node build.mjs           one-shot build
 *   node build.mjs --watch   rebuild on change
 *
 * The plugin is bundled as a single self-contained ESM file inside the
 * .sdPlugin folder (@elgato/streamdeck is ESM-only), so the folder can be
 * copied to the Stream Deck plugins directory without node_modules.
 */
import * as esbuild from "esbuild";
import fs from "node:fs";

const watch = process.argv.includes("--watch");

// ws optionally requires these native addons inside try/catch; keep them
// external and provide require() so the fallback path works in ESM output.
const esmBanner = [
  `import { createRequire } from "node:module";`,
  `const require = createRequire(import.meta.url);`,
].join("\n");

/** @type {esbuild.BuildOptions} */
const plugin = {
  entryPoints: ["src/plugin.ts"],
  outfile: "com.kaita.forza.sdPlugin/bin/plugin.js",
  bundle: true,
  platform: "node",
  target: "node20",
  loader: { ".html": "text" },
  format: "esm",
  external: ["bufferutil", "utf-8-validate"],
  banner: { js: esmBanner },
  logLevel: "info",
};

/** @type {esbuild.BuildOptions} */
const tools = {
  entryPoints: ["src/listen.ts", "src/dump.ts", "src/ui-server.ts"],
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  target: "node20",
  loader: { ".html": "text" },
  format: "cjs",
  logLevel: "info",
};

// Node resolves the bundle as ESM via the nearest package.json.
fs.mkdirSync("com.kaita.forza.sdPlugin/bin", { recursive: true });
fs.writeFileSync(
  "com.kaita.forza.sdPlugin/bin/package.json",
  JSON.stringify({ type: "module" }, null, 2),
);

if (watch) {
  const contexts = await Promise.all([esbuild.context(plugin), esbuild.context(tools)]);
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching for changes…");
} else {
  await Promise.all([esbuild.build(plugin), esbuild.build(tools)]);
}
