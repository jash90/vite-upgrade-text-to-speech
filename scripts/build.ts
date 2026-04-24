import tailwindPlugin from "bun-plugin-tailwind";
import { rm } from "node:fs/promises";

const outdir = "./dist";

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir,
  plugins: [tailwindPlugin],
  minify: true,
  splitting: true,
  target: "browser",
  sourcemap: "linked",
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

console.log(`Built ${result.outputs.length} file(s) to ${outdir}`);
