import tailwindPlugin from "bun-plugin-tailwind";
import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const outdir = "./dist";

await rm(outdir, { recursive: true, force: true });

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

console.log(`Built ${result.outputs.length} file(s) to ${outdir}`);
