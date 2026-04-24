/**
 * Thin wrapper around @mintplex-labs/piper-tts-web.
 *
 * The underlying library pulls in onnxruntime-web and spawns a Worker for
 * inference. Dynamic imports keep all of that out of the main bundle so the
 * OpenAI-only flow stays fast and is not affected if the library fails to
 * load (e.g. unsupported browser, blocked CDN).
 */

export interface LocalProgress {
  url: string;
  total: number;
  loaded: number;
}
export type LocalProgressCallback = (p: LocalProgress) => void;

type PiperModule = typeof import('@mintplex-labs/piper-tts-web');

let modulePromise: Promise<PiperModule> | null = null;

function loadPiper(): Promise<PiperModule> {
  if (!modulePromise) {
    modulePromise = import('@mintplex-labs/piper-tts-web');
  }
  return modulePromise;
}

export async function synthesize(text: string, voiceId: string): Promise<Blob> {
  const { predict } = await loadPiper();
  return predict({ text, voiceId });
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
  const { remove } = await loadPiper();
  await remove(voiceId);
}
