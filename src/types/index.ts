export type VoiceType =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'nova'
  | 'onyx'
  | 'sage'
  | 'shimmer'
  | 'verse';

export type ModelType = 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  content: string;
  status: 'pending' | 'reading' | 'success' | 'error';
  error?: string;
}

export interface VoiceOption {
  value: VoiceType;
  label: string;
}

export interface ModelOption {
  value: ModelType;
  label: string;
  description: string;
  voices: VoiceType[];
}

const CLASSIC_VOICES: VoiceType[] = [
  'alloy',
  'echo',
  'fable',
  'nova',
  'onyx',
  'shimmer',
];

const EXTENDED_VOICES: VoiceType[] = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
];

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'tts-1',
    label: 'TTS-1',
    description: 'Fast, lower quality. 6 classic voices.',
    voices: CLASSIC_VOICES,
  },
  {
    value: 'tts-1-hd',
    label: 'TTS-1 HD',
    description: 'Higher quality, slower. 6 classic voices.',
    voices: CLASSIC_VOICES,
  },
  {
    value: 'gpt-4o-mini-tts',
    label: 'GPT-4o mini TTS',
    description: 'Newest model. Full voice set with more expressive output.',
    voices: EXTENDED_VOICES,
  },
];

export const VOICE_OPTIONS: VoiceOption[] = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'ash', label: 'Ash' },
  { value: 'ballad', label: 'Ballad' },
  { value: 'coral', label: 'Coral' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'nova', label: 'Nova' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'sage', label: 'Sage' },
  { value: 'shimmer', label: 'Shimmer' },
  { value: 'verse', label: 'Verse' },
];

export const DEFAULT_MODEL: ModelType = 'tts-1';
export const DEFAULT_VOICE: VoiceType = 'alloy';

// ---- Engines ----
export type TTSEngine = 'openai' | 'local';
export const DEFAULT_ENGINE: TTSEngine = 'openai';

// ---- Local Piper voices (run fully in-browser via @mintplex-labs/piper-tts-web) ----
export type LocalLang = 'pl' | 'en';

export interface LocalVoice {
  voiceId: string; // must match a Piper voiceId from rhasspy/piper-voices catalog
  lang: LocalLang;
  label: string;
  gender: 'male' | 'female';
  sizeMB: number; // approximate download size
}

export const LOCAL_VOICES: LocalVoice[] = [
  { voiceId: 'pl_PL-darkman-medium', lang: 'pl', label: 'Darkman (PL, męski)', gender: 'male', sizeMB: 63 },
  { voiceId: 'pl_PL-gosia-medium', lang: 'pl', label: 'Gosia (PL, żeński)', gender: 'female', sizeMB: 63 },
  { voiceId: 'pl_PL-mc_speech-medium', lang: 'pl', label: 'MC Speech (PL, męski)', gender: 'male', sizeMB: 63 },
  { voiceId: 'en_US-ryan-medium', lang: 'en', label: 'Ryan (EN-US, male)', gender: 'male', sizeMB: 63 },
  { voiceId: 'en_US-hfc_female-medium', lang: 'en', label: 'HFC Female (EN-US)', gender: 'female', sizeMB: 63 },
];

export const DEFAULT_LOCAL_LANG: LocalLang = 'pl';
export const DEFAULT_LOCAL_VOICE_ID = 'pl_PL-darkman-medium';

export const LOCAL_TEST_SENTENCES: Record<LocalLang, string> = {
  pl: 'Cześć, to jest test wybranego głosu.',
  en: 'Hello, this is a test of the selected voice.',
};

// Public voice previews hosted by OpenAI (CORS-enabled, no API key needed).
// Voices not listed here (ballad, verse) fall back to API generation on Test Voice.
const VOICE_SAMPLE_BASE = 'https://cdn.openai.com/API/docs/audio';
export const VOICE_SAMPLE_URLS: Partial<Record<VoiceType, string>> = {
  alloy: `${VOICE_SAMPLE_BASE}/alloy.wav`,
  ash: `${VOICE_SAMPLE_BASE}/ash.wav`,
  coral: `${VOICE_SAMPLE_BASE}/coral.wav`,
  echo: `${VOICE_SAMPLE_BASE}/echo.wav`,
  fable: `${VOICE_SAMPLE_BASE}/fable.wav`,
  nova: `${VOICE_SAMPLE_BASE}/nova.wav`,
  onyx: `${VOICE_SAMPLE_BASE}/onyx.wav`,
  sage: `${VOICE_SAMPLE_BASE}/sage.wav`,
  shimmer: `${VOICE_SAMPLE_BASE}/shimmer.wav`,
};

export const MAX_FILES = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const CHUNK_SIZE = 4000;
// Piper's ONNX graph uses int32 tensor indices and overflows
// ("SafeIntOnOverflow") well before the OpenAI character limit. Keep local
// chunks small to (a) stay in int32 range and (b) keep peak WASM allocation
// per inference low — the WASM heap also runs out of memory ("std::bad_alloc")
// over many sequential calls.
export const LOCAL_CHUNK_SIZE = 500;

export interface AudioOutput {
  id: string;
  name: string;
  filename: string;
  sourceType: 'file' | 'merged' | 'text';
  text: string;
  audioUrl: string | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}
