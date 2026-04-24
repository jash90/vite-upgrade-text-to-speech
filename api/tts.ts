export const config = { runtime: 'edge' };

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const auth = req.headers.get('authorization');
  if (!auth) {
    return Response.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    );
  }

  const body = await req.text();
  const upstream = await fetch(OPENAI_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
    },
  });
}
