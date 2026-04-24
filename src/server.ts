import index from "../index.html";
import app from "../app.html";
import { file } from "bun";
import { join } from "node:path";

const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const port = Number(process.env.PORT ?? 3000);
const isDev = process.env.NODE_ENV !== "production";
const publicDir = new URL("../public", import.meta.url).pathname;

async function servePublic(pathname: string): Promise<Response | null> {
  // Strip leading slash, disallow path traversal.
  const safe = pathname.replace(/^\//, "").replace(/\.\.\//g, "");
  if (!safe) return null;
  const f = file(join(publicDir, safe));
  if (!(await f.exists())) return null;
  return new Response(f);
}

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const publicResponse = await servePublic(url.pathname);
    if (publicResponse) return publicResponse;
    return new Response("Not found", { status: 404 });
  },
  routes: {
    "/": index,
    "/app": app,
    "/api/tts": {
      async POST(req) {
        const auth = req.headers.get("authorization");
        if (!auth) {
          return Response.json(
            { error: "Missing Authorization header" },
            { status: 401 },
          );
        }
        const body = await req.text();
        const upstream = await fetch(OPENAI_TTS_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
          body,
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("content-type") ?? "audio/mpeg",
          },
        });
      },
    },
  },
  development: isDev ? { hmr: true } : false,
});

console.log(`${isDev ? "Dev" : "Preview"} server running at ${server.url}`);
