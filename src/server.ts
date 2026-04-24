import index from "../index.html";

const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const port = Number(process.env.PORT ?? 3000);
const isDev = process.env.NODE_ENV !== "production";

const server = Bun.serve({
  port,
  routes: {
    "/": index,
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
