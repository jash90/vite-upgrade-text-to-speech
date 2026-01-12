export type VoiceType = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

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

export const VOICE_OPTIONS: VoiceOption[] = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

export const MAX_FILES = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const CHUNK_SIZE = 4000;

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
