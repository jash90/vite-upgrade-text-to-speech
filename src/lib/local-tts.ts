/**
 * Thin wrapper around @mintplex-labs/piper-tts-web.
 *
 * The underlying library pulls in onnxruntime-web and spawns a Worker for
 * inference. Dynamic imports keep all of that out of the main bundle so the
 * OpenAI-only flow stays fast and is not affected if the library fails to
 * load (e.g. unsupported browser, blocked CDN).
 *
 * Quirks worked around here:
 *   1. piper-tts-web v1.0.4 hardcodes a cdnjs onnxruntime-web 1.18.0 path
 *      that never hosted the expected `.mjs` files (404). We override
 *      `wasmPaths.onnxWasm` to a working jsdelivr URL pinned to the
 *      onnxruntime-web JS version we install, to avoid WASM<->JS ABI
 *      mismatches ("e.getValue is not a function").
 *   2. The library keeps a static singleton (`TtsSession._instance`) and
 *      `create()` reuses it regardless of voiceId — only overwriting the
 *      `voiceId` field while the loaded ONNX model stays from the first
 *      voice. Switching voices looks like it works in the UI but synth
 *      keeps using the original model. We null out the singleton before
 *      creating a session for a different voice.
 */

export interface LocalProgress {
  url: string;
  total: number;
  loaded: number;
}
export type LocalProgressCallback = (p: LocalProgress) => void;

type PiperModule = typeof import('@mintplex-labs/piper-tts-web');
type TtsSessionInstance = InstanceType<PiperModule['TtsSession']>;

const WASM_PATHS = {
  onnxWasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
  piperData:
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  piperWasm:
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
};

let modulePromise: Promise<PiperModule> | null = null;

function loadPiper(): Promise<PiperModule> {
  if (!modulePromise) {
    modulePromise = import('@mintplex-labs/piper-tts-web');
  }
  return modulePromise;
}

async function getSession(voiceId: string): Promise<TtsSessionInstance> {
  const mod = await loadPiper();
  const existing = mod.TtsSession._instance;
  if (existing && existing.voiceId === voiceId && existing.ready) {
    return existing;
  }
  // Force re-init with the requested voice. The library otherwise returns
  // the stale singleton with the first-loaded model.
  mod.TtsSession._instance = null;
  return mod.TtsSession.create({ voiceId, wasmPaths: WASM_PATHS });
}

export async function synthesize(text: string, voiceId: string): Promise<Blob> {
  const session = await getSession(voiceId);
  return session.predict(text);
}

export async function downloadModel(
  voiceId: string,
  onProgress?: LocalProgressCallback,
): Promise<void> {
  const { download } = await loadPiper();
  await download(voiceId, onProgress);
}

export async function isDownloaded(voiceId: string): Promise<boolean> {
  const { stored } = await loadPiper();
  const ids = await stored();
  return ids.includes(voiceId);
}

export async function listDownloaded(): Promise<string[]> {
  const { stored } = await loadPiper();
  return stored();
}

export async function removeModel(voiceId: string): Promise<void> {
  const mod = await loadPiper();
  if (mod.TtsSession._instance && mod.TtsSession._instance.voiceId === voiceId) {
    mod.TtsSession._instance = null;
  }
  await mod.remove(voiceId);
}
