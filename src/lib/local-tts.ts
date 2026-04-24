/**
 * Public API for Piper TTS — thin RPC client over a dedicated Web Worker.
 *
 * All Piper/onnxruntime-web work happens inside `local-tts-worker.ts` so
 * inference (hundreds of ms per sentence) never blocks the UI thread.
 * CSS animations, spinners and scroll stay smooth during generation.
 *
 * The public surface (synthesize / resetSession / downloadModel /
 * isDownloaded / listDownloaded / removeModel) is unchanged, so callers
 * in `useTTS.ts` and `LocalVoiceSelector.tsx` don't need to know a worker
 * exists.
 */

export interface LocalProgress {
  url: string;
  total: number;
  loaded: number;
}
export type LocalProgressCallback = (p: LocalProgress) => void;

type WorkerRequest =
  | { id: number; type: 'synthesize'; voiceId: string; text: string }
  | { id: number; type: 'reset' }
  | { id: number; type: 'download'; voiceId: string }
  | { id: number; type: 'isDownloaded'; voiceId: string }
  | { id: number; type: 'listDownloaded' }
  | { id: number; type: 'removeModel'; voiceId: string };

type WorkerResponse =
  | { id: number; type: 'progress'; progress: LocalProgress }
  | { id: number; type: 'result'; buffer?: ArrayBuffer; value?: unknown }
  | { id: number; type: 'error'; message: string };

interface PendingCall {
  resolve: (value: { buffer?: ArrayBuffer; value?: unknown }) => void;
  reject: (reason: Error) => void;
  onProgress?: LocalProgressCallback;
}

// Plain Omit collapses discriminated unions — voiceId/text get unified away.
// Distribute Omit across each member so type stays precise per variant.
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingCall>();

function resolveWorkerUrl(): string | URL {
  // scripts/build.ts injects this at build time after emitting the
  // hashed worker file. Absent in dev — Bun's dev server serves the
  // TS module URL directly, so the new URL() fallback works there.
  const configured = (globalThis as { __PIPER_WORKER_URL__?: string })
    .__PIPER_WORKER_URL__;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  return new URL('./local-tts-worker.ts', import.meta.url);
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(resolveWorkerUrl(), {
    type: 'module',
    name: 'piper-tts',
  });
  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;
    const call = pending.get(msg.id);
    if (!call) return;
    if (msg.type === 'progress') {
      call.onProgress?.(msg.progress);
      return;
    }
    pending.delete(msg.id);
    if (msg.type === 'result') {
      call.resolve({ buffer: msg.buffer, value: msg.value });
    } else {
      call.reject(new Error(msg.message));
    }
  });
  worker.addEventListener('error', (event) => {
    // Surface worker bootstrap failures (bad CDN, module load, etc.) as
    // rejections on every in-flight call. Without this they hang forever.
    const err = new Error(event.message || 'Piper worker error');
    for (const call of pending.values()) call.reject(err);
    pending.clear();
  });
  return worker;
}

function request(
  req: DistributiveOmit<WorkerRequest, 'id'>,
  onProgress?: LocalProgressCallback,
): Promise<{ buffer?: ArrayBuffer; value?: unknown }> {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ ...req, id });
  });
}

export async function synthesize(text: string, voiceId: string): Promise<Blob> {
  const { buffer } = await request({ type: 'synthesize', voiceId, text });
  if (!buffer) throw new Error('Piper worker returned no audio buffer');
  // Piper outputs a WAV byte stream via its internal Blob. We got the raw
  // bytes back through a transferable, so re-wrap with the same mime type.
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Drops the worker's cached Piper singleton so the next `synthesize()`
 * re-initialises the onnxruntime-web WASM heap. Long batches fragment
 * the heap and eventually throw std::bad_alloc — model weights stay
 * cached in OPFS so reload cost is just re-inflating them into WASM.
 */
export async function resetSession(): Promise<void> {
  await request({ type: 'reset' });
}

export async function downloadModel(
  voiceId: string,
  onProgress?: LocalProgressCallback,
): Promise<void> {
  await request({ type: 'download', voiceId }, onProgress);
}

export async function isDownloaded(voiceId: string): Promise<boolean> {
  const { value } = await request({ type: 'isDownloaded', voiceId });
  return Boolean(value);
}

export async function listDownloaded(): Promise<string[]> {
  const { value } = await request({ type: 'listDownloaded' });
  return (value as string[]) ?? [];
}

export async function removeModel(voiceId: string): Promise<void> {
  await request({ type: 'removeModel', voiceId });
}
