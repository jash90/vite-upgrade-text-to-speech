import tailwindPlugin from "bun-plugin-tailwind";
import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { relative } from "node:path";

const outdir = "./dist";

await rm(outdir, { recursive: true, force: true });

// Build the Piper worker first so we know its hashed URL before building
// the main bundle. Bun 1.3.11 does not yet recognise
// `new Worker(new URL('./w.ts', import.meta.url))` as a bundler
// directive, so an explicit entrypoint build is required. splitting:false
// keeps piper + onnxruntime-web + voices in one file — it's lazy-loaded
// only when the local TTS engine is selected, so a fatter single chunk
// beats juggling shared chunks between worker and main.
const workerResult = await Bun.build({
  entrypoints: ["./src/lib/local-tts-worker.ts"],
  outdir,
  plugins: [tailwindPlugin],
  minify: true,
  splitting: false,
  target: "browser",
  sourcemap: "linked",
  naming: "[name]-[hash].[ext]",
});

if (!workerResult.success) {
  console.error("Piper worker build failed:");
  for (const message of workerResult.logs) console.error(message);
  process.exit(1);
}

const workerEntry = workerResult.outputs.find((o) => o.kind === "entry-point");
if (!workerEntry) {
  console.error("Piper worker build produced no entry output");
  process.exit(1);
}
const workerUrl = "/" + relative(outdir, workerEntry.path);

const result = await Bun.build({
  entrypoints: ["./index.html", "./app.html"],
  outdir,
  plugins: [tailwindPlugin],
  minify: true,
  splitting: true,
  target: "browser",
  sourcemap: "linked",
  // Include [name] + [hash] for chunks/assets so emissions from different
  // HTML entries can't collide (older Bun with splitting + multi-HTML).
  // Keep HTML entry filenames stable (index.html, app.html) but force a
  // [name]+[hash] template for emitted chunks and assets. Older Bun with
  // splitting + multi-HTML can otherwise collide on shared CSS imports
  // ("Multiple files share the same output path: chunk-xxx.css").
  naming: {
    entry: "[dir]/[name].[ext]",
    chunk: "[name]-[hash].[ext]",
    asset: "[name]-[hash].[ext]",
  },
  define: {
    "globalThis.__PIPER_WORKER_URL__": JSON.stringify(workerUrl),
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

// Copy public/ → dist/ for static SEO assets (robots.txt, sitemap.xml, og.png).
// Done after Bun.build so bundler output (index.html, chunks) is not overwritten.
if (existsSync("./public")) {
  await cp("./public", outdir, { recursive: true });
}

console.log(
  `Built ${result.outputs.length + workerResult.outputs.length} file(s) to ${outdir}`,
);
console.log(`Piper worker: ${workerUrl}`);
