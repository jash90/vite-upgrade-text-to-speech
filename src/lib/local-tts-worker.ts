/// <reference lib="webworker" />

/**
 * Dedicated Web Worker that hosts Piper TTS.
 *
 * The upstream @mintplex-labs/piper-tts-web library spins up onnxruntime-web
 * on whatever thread imports it — and on main thread that means every
 * inference (hundreds of ms to seconds per sentence) blocks paint,
 * scrolling, and CSS animations. Moving the whole module here keeps ORT
 * + phonemizer WASM off the main thread entirely.
 *
 * The main thread talks to this worker over a tiny request/response
 * protocol keyed by `id`. Long-running ops (downloadModel) emit multiple
 * `progress` messages before their final `result`.
 */

import type * as PiperModule from '@mintplex-labs/piper-tts-web';

declare const self: DedicatedWorkerGlobalScope;

type TtsSessionInstance = PiperModule.TtsSession;

const WASM_PATHS = {
  onnxWasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
  piperData:
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  piperWasm:
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
};

let modulePromise: Promise<typeof PiperModule> | null = null;

function loadPiper(): Promise<typeof PiperModule> {
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
  // Piper's TtsSession is a module-level singleton keyed implicitly by
  // the first voice loaded. Without nulling it we'd keep synthesizing
  // with the wrong model after a voice switch.
  mod.TtsSession._instance = null;
  return mod.TtsSession.create({ voiceId, wasmPaths: WASM_PATHS });
}

type RequestMessage =
  | { id: number; type: 'synthesize'; voiceId: string; text: string }
  | { id: number; type: 'download'; voiceId: string }
  | { id: number; type: 'isDownloaded'; voiceId: string }
  | { id: number; type: 'listDownloaded' }
  | { id: number; type: 'removeModel'; voiceId: string };

type ResponseMessage =
  | { id: number; type: 'progress'; progress: { url: string; total: number; loaded: number } }
  | { id: number; type: 'result'; buffer?: ArrayBuffer; value?: unknown }
  | { id: number; type: 'error'; message: string };

function post(msg: ResponseMessage, transfer?: Transferable[]): void {
  if (transfer && transfer.length > 0) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

async function handle(req: RequestMessage): Promise<void> {
  try {
    switch (req.type) {
      case 'synthesize': {
        const session = await getSession(req.voiceId);
        const blob = await session.predict(req.text);
        const buffer = await blob.arrayBuffer();
        post({ id: req.id, type: 'result', buffer }, [buffer]);
        return;
      }
      case 'download': {
        const { download } = await loadPiper();
        await download(req.voiceId, (p) => {
          post({ id: req.id, type: 'progress', progress: p });
        });
        post({ id: req.id, type: 'result' });
        return;
      }
      case 'isDownloaded': {
        const { stored } = await loadPiper();
        const ids = await stored();
        post({ id: req.id, type: 'result', value: ids.includes(req.voiceId) });
        return;
      }
      case 'listDownloaded': {
        const { stored } = await loadPiper();
        const ids = await stored();
        post({ id: req.id, type: 'result', value: ids });
        return;
      }
      case 'removeModel': {
        const mod = await loadPiper();
        if (
          mod.TtsSession._instance &&
          mod.TtsSession._instance.voiceId === req.voiceId
        ) {
          mod.TtsSession._instance = null;
        }
        await mod.remove(req.voiceId);
        post({ id: req.id, type: 'result' });
        return;
      }
    }
  } catch (err) {
    post({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.addEventListener('message', (event: MessageEvent<RequestMessage>) => {
  void handle(event.data);
});

export {};
