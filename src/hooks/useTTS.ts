import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import {
  LOCAL_CHUNK_SIZE,
  LOCAL_TEST_SENTENCES,
  LOCAL_VOICES,
  VOICE_SAMPLE_URLS,
  type AudioOutput,
  type LocalLang,
  type ModelType,
  type TTSEngine,
  type VoiceType,
} from '@/types';
import {
  splitTextForLocalTTS,
  splitTextIntoChunks,
  removeExtraWhitespaces,
} from '@/lib/text-processing';
import { concatenateBuffers, mergeAudioBuffers } from '@/lib/audio-utils';
import {
  isDownloaded as isLocalDownloaded,
  resetSession as resetLocalSession,
  synthesize as synthesizeLocal,
} from '@/lib/local-tts';

const TTS_ENDPOINT = '/api/tts';
const CHUNK_SIZE = 4000;
const TEST_TEXT = 'This is a test of the selected voice.';

interface UseTTSParams {
  engine: TTSEngine;
  apiKey: string;
  voice: VoiceType;
  model: ModelType;
  localVoiceId: string;
}

interface UseTTSResult {
  isProcessing: boolean;
  isTesting: boolean;
  progress: number;
  audioUrl: string | null;
  testAudioUrl: string | null;
  convertToSpeech: (text: string) => Promise<void>;
  convertMultiple: (
    outputs: AudioOutput[],
    onProgress: (outputs: AudioOutput[]) => void
  ) => Promise<AudioOutput[]>;
  testVoice: () => Promise<void>;
  downloadAudio: (filename?: string) => void;
  downloadFromUrl: (url: string, filename: string) => void;
  reset: () => void;
}

/**
 * Custom hook for text-to-speech conversion using OpenAI API
 *
 * @param params - Configuration parameters
 * @param params.apiKey - OpenAI API key
 * @param params.voice - Voice type to use for TTS
 * @returns TTS controls and state
 */
export function useTTS({ engine, apiKey, voice, model, localVoiceId }: UseTTSParams): UseTTSResult {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);

  const { toast } = useToast();

  // Track blob URLs for cleanup
  const audioUrlRef = useRef<string | null>(null);
  const testAudioUrlRef = useRef<string | null>(null);

  // Progress updates fire dozens of times per second (axios onDownloadProgress
  // on the OpenAI path, per-chunk in the local path). Each call schedules a
  // React render of TTSPage + all its children, which competes with CSS
  // animations for paint budget. Coalesce into at most one setProgress per
  // animation frame; the latest value wins and final 100 always flushes.
  const latestProgress = useRef<number>(0);
  const progressFrame = useRef<number | null>(null);
  const setProgressThrottled = useCallback((value: number) => {
    latestProgress.current = value;
    if (progressFrame.current !== null) return;
    progressFrame.current = requestAnimationFrame(() => {
      progressFrame.current = null;
      setProgress(latestProgress.current);
    });
  }, []);
  const flushProgress = useCallback((value: number) => {
    if (progressFrame.current !== null) {
      cancelAnimationFrame(progressFrame.current);
      progressFrame.current = null;
    }
    latestProgress.current = value;
    setProgress(value);
  }, []);

  /**
   * Sends a text chunk to OpenAI TTS API and returns audio buffer
   */
  const sendTextForTTS = useCallback(
    async (
      text: string,
      chunkIndex: number,
      onProgress?: (percentage: number) => void
    ): Promise<ArrayBuffer | null> => {
      const textLength = text.length;
      try {
        const response = await axios.post<ArrayBuffer>(
          TTS_ENDPOINT,
          {
            model,
            input: text,
            voice,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            onDownloadProgress: (progressEvent) => {
              if (onProgress) {
                if (progressEvent.total) {
                  // If total size is known, calculate exact percentage
                  const percentage = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  onProgress(percentage);
                } else {
                  // Estimate total size based on text length
                  // Typical MP3 from OpenAI TTS: ~40-60 bytes per character
                  // Using 50 bytes/char as average
                  const estimatedTotal = textLength * 50;
                  const loaded = progressEvent.loaded;

                  // Calculate percentage, cap at 95% until download completes
                  const percentage = Math.min(
                    95,
                    Math.round((loaded * 100) / estimatedTotal)
                  );
                  onProgress(percentage);
                }
              }
            },
          }
        );
        console.log(`Chunk ${chunkIndex} audio generated`);
        return response.data;
      } catch (error) {
        console.error('Error generating speech:', error);

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          let message = 'Failed to generate speech.';

          if (status === 401) {
            message = 'Invalid API key. Please check your OpenAI API key.';
          } else if (status === 429) {
            message = 'Rate limit exceeded. Please try again later.';
          } else if (status === 500) {
            message = 'OpenAI service error. Please try again later.';
          }

          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'An unexpected error occurred while generating speech.',
            variant: 'destructive',
          });
        }

        return null;
      }
    },
    [apiKey, voice, model, toast]
  );

  /**
   * Cleans up a blob URL and revokes it
   */
  const cleanupBlobUrl = useCallback((urlRef: React.MutableRefObject<string | null>) => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  /**
   * Merges multiple audio buffers into a single audio blob
   * Uses Web Audio API for proper audio merging (outputs WAV)
   * Falls back to simple concatenation for single chunk (keeps MP3)
   */
  const mergeBuffers = useCallback(async (buffers: ArrayBuffer[]): Promise<Blob> => {
    // Always use simple concatenation as per user request (reverts to previous behavior)
    return concatenateBuffers(buffers);
  }, []);

  /**
   * Converts text to speech, handling chunking for long texts
   */
  const convertToSpeech = useCallback(
    async (text: string): Promise<void> => {
      if (!text || text.trim().length === 0) {
        toast({
          title: 'Error',
          description: 'Please enter text to convert.',
          variant: 'destructive',
        });
        return;
      }

      if (!apiKey) {
        toast({
          title: 'Error',
          description: 'Please enter your OpenAI API key.',
          variant: 'destructive',
        });
        return;
      }

      flushProgress(0);
      setIsProcessing(true);

      // Clean up previous audio URL
      cleanupBlobUrl(audioUrlRef);
      setAudioUrl(null);

      try {
        const cleanedText = removeExtraWhitespaces(text);
        const chunks = splitTextIntoChunks(cleanedText, CHUNK_SIZE);
        const audioBuffers: ArrayBuffer[] = [];
        const totalChunks = chunks.length;

        for (let i = 0; i < chunks.length; i++) {
          const audioData = await sendTextForTTS(chunks[i], i, (chunkProgress) => {
            const currentProgress = Math.min(
              100,
              Math.floor(((i + chunkProgress / 100) / totalChunks) * 100)
            );
            setProgressThrottled(currentProgress);
          });

          if (audioData) {
            audioBuffers.push(audioData);
          } else {
            throw new Error(`Failed to generate audio for chunk ${i + 1}`);
          }
        }
        // Merge all audio buffers into a single blob
        const mergedAudioBlob = await mergeBuffers(audioBuffers);
        const newAudioUrl = URL.createObjectURL(mergedAudioBlob);

        audioUrlRef.current = newAudioUrl;
        setAudioUrl(newAudioUrl);

        toast({
          title: 'Success',
          description: 'Audio generated successfully!',
        });
      } catch (error) {
        console.error('Error processing text:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
        flushProgress(100);
      }
    },
    [apiKey, sendTextForTTS, cleanupBlobUrl, mergeBuffers, toast, flushProgress, setProgressThrottled]
  );

  /**
   * Tests the selected voice. Prefers OpenAI's public voice preview CDN
   * (no API key, no API call, no cost). Falls back to API generation only
   * when the voice has no preview or the CDN fetch fails.
   */
  const testVoice = useCallback(async (): Promise<void> => {
    setIsTesting(true);
    cleanupBlobUrl(testAudioUrlRef);
    setTestAudioUrl(null);

    if (engine === 'local') {
      try {
        const voiceMeta = LOCAL_VOICES.find((v) => v.voiceId === localVoiceId);
        const lang: LocalLang = voiceMeta?.lang ?? 'en';
        const sentence = LOCAL_TEST_SENTENCES[lang];
        const blob = await synthesizeLocal(sentence, localVoiceId);
        const url = URL.createObjectURL(blob);
        testAudioUrlRef.current = url;
        setTestAudioUrl(url);
      } catch (error) {
        console.error('Local TTS test failed:', error);
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? `Local TTS failed: ${error.message}`
              : 'Local TTS failed. Did you download the model?',
          variant: 'destructive',
        });
      } finally {
        setIsTesting(false);
      }
      return;
    }

    const sampleUrl = VOICE_SAMPLE_URLS[voice];
    if (sampleUrl) {
      try {
        const head = await fetch(sampleUrl, { method: 'HEAD' });
        if (head.ok) {
          setTestAudioUrl(sampleUrl);
          setIsTesting(false);
          return;
        }
      } catch {
        // fall through to API
      }
    }

    if (!apiKey) {
      toast({
        title: 'Error',
        description:
          sampleUrl
            ? 'Preview unavailable — API key required to generate a sample.'
            : 'This voice has no public preview. Enter an API key to generate a sample.',
        variant: 'destructive',
      });
      setIsTesting(false);
      return;
    }

    try {
      const audioData = await sendTextForTTS(TEST_TEXT, 0, (percentage) => {
        setProgressThrottled(percentage);
      });

      if (audioData) {
        const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
        const newTestAudioUrl = URL.createObjectURL(audioBlob);
        testAudioUrlRef.current = newTestAudioUrl;
        setTestAudioUrl(newTestAudioUrl);
        toast({
          title: 'Success',
          description: 'Voice test generated successfully!',
        });
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      toast({
        title: 'Error',
        description: 'Failed to test voice. Please check your API key and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  }, [engine, apiKey, voice, localVoiceId, sendTextForTTS, cleanupBlobUrl, toast, setProgressThrottled]);

  /**
   * Downloads the generated audio file
   */
  const downloadAudio = useCallback(
    (filename: string = 'generated_audio.mp3'): void => {
      if (!audioUrl) {
        toast({
          title: 'Error',
          description: 'No audio available to download.',
          variant: 'destructive',
        });
        return;
      }

      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [audioUrl, toast]
  );

  /**
   * Downloads audio from a specific URL
   */
  const downloadFromUrl = useCallback(
    (url: string, filename: string): void => {
      const link = document.createElement('a');
      link.href = url;
      link.download = /\.(mp3|wav|ogg|m4a)$/i.test(filename) ? filename : `${filename}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    []
  );

  /**
   * Converts multiple text items to speech sequentially
   * Returns updated AudioOutput array with audio URLs
   */
  const convertMultiple = useCallback(
    async (
      outputs: AudioOutput[],
      onProgress: (outputs: AudioOutput[]) => void
    ): Promise<AudioOutput[]> => {
      if (engine === 'openai' && !apiKey) {
        toast({
          title: 'Error',
          description: 'Please enter your OpenAI API key.',
          variant: 'destructive',
        });
        return outputs;
      }

      if (engine === 'local' && !(await isLocalDownloaded(localVoiceId))) {
        toast({
          title: 'Error',
          description: 'Download the selected local model before converting.',
          variant: 'destructive',
        });
        return outputs;
      }

      setIsProcessing(true);
      flushProgress(0);

      const updatedOutputs = [...outputs];
      const totalItems = outputs.length;
      let completedItems = 0;
      const successBuffersByIndex = new Map<number, ArrayBuffer[]>();

      for (let i = 0; i < updatedOutputs.length; i++) {
        const output = updatedOutputs[i];

        if (!output.text || output.text.trim().length === 0) {
          updatedOutputs[i] = { ...output, status: 'error', error: 'No text to convert' };
          onProgress([...updatedOutputs]);
          continue;
        }

        // Fresh WASM heap per item for local engine — onnxruntime-web
        // fragments memory across sequential inferences and eventually
        // throws std::bad_alloc. Reset before each item except the first.
        if (engine === 'local' && i > 0) {
          await resetLocalSession();
        }

        updatedOutputs[i] = { ...output, status: 'processing' };
        onProgress([...updatedOutputs]);

        try {
          const cleanedText = removeExtraWhitespaces(output.text);
          const audioBuffers: ArrayBuffer[] = [];
          let itemBlob: Blob;

          if (engine === 'local') {
            // Piper's ONNX graph overflows int32 on long inputs
            // ("SafeIntOnOverflow"). Chunk client-side and merge via
            // Web Audio decode + MP3 re-encode (WAV byte-concat is invalid).
            const localChunks = splitTextForLocalTTS(cleanedText, LOCAL_CHUNK_SIZE);
            if (localChunks.length === 0) {
              throw new Error('No text to synthesize');
            }

            const RESET_EVERY = 8;
            for (let j = 0; j < localChunks.length; j++) {
              // Flush the onnxruntime-web WASM heap periodically. Without
              // this, long items (30+ chunks) hit std::bad_alloc mid-way —
              // fresh-session-per-item isn't enough, since fragmentation
              // accumulates within a single file too.
              if (j > 0 && j % RESET_EVERY === 0) {
                await resetLocalSession();
              }
              const blob = await synthesizeLocal(localChunks[j], localVoiceId);
              const buf = await blob.arrayBuffer();
              audioBuffers.push(buf);
              const inItemProgress = (j + 1) / localChunks.length;
              const globalProgress = Math.floor(((completedItems + inItemProgress) / totalItems) * 100);
              setProgressThrottled(Math.min(100, globalProgress));
            }

            itemBlob =
              audioBuffers.length === 1
                ? new Blob([audioBuffers[0]], { type: 'audio/wav' })
                : await mergeAudioBuffers(audioBuffers);
            completedItems++;
            setProgressThrottled(Math.floor((completedItems / totalItems) * 100));
          } else {
            const chunks = splitTextIntoChunks(cleanedText, CHUNK_SIZE);
            for (let j = 0; j < chunks.length; j++) {
              const audioData = await sendTextForTTS(chunks[j], j, (chunkProgress) => {
                const activeItemProgressRaw = (j + chunkProgress / 100) / chunks.length;
                const globalProgress = Math.floor(((completedItems + activeItemProgressRaw) / totalItems) * 100);
                setProgressThrottled(Math.min(100, globalProgress));
              });
              if (audioData) audioBuffers.push(audioData);
              else throw new Error(`Failed to generate audio for chunk ${j + 1}`);
            }
            itemBlob = await mergeBuffers(audioBuffers);
            completedItems++;
            setProgressThrottled(Math.floor((completedItems / totalItems) * 100));
          }

          const itemUrl = URL.createObjectURL(itemBlob);
          const localIsWav = engine === 'local' && audioBuffers.length === 1;
          const outputFilename = localIsWav
            ? output.filename.replace(/\.mp3$/i, '.wav')
            : output.filename.replace(/\.wav$/i, '.mp3');

          updatedOutputs[i] = {
            ...output,
            status: 'success',
            audioUrl: itemUrl,
            filename: outputFilename,
          };
          successBuffersByIndex.set(i, audioBuffers);

          onProgress([...updatedOutputs]);
        } catch (error) {
          console.error(`Error processing ${output.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          updatedOutputs[i] = { ...output, status: 'error', error: errorMessage };
          onProgress([...updatedOutputs]);
        }
      }

      // If 2+ sources produced audio, build a merged output.
      // OpenAI path: byte-concat same-format MP3s (lossless, no re-encoding).
      // Local path: decode WAVs via Web Audio + re-encode as MP3 (WAV headers make byte-concat invalid).
      if (successBuffersByIndex.size >= 2) {
        const orderedIndices = [...successBuffersByIndex.keys()].sort((a, b) => a - b);
        const allBuffers = orderedIndices.flatMap((idx) => successBuffersByIndex.get(idx)!);
        const mergedBlob =
          engine === 'local'
            ? await mergeAudioBuffers(allBuffers)
            : concatenateBuffers(allBuffers);
        const mergedUrl = URL.createObjectURL(mergedBlob);
        const sourceNames = orderedIndices
          .map((idx) => updatedOutputs[idx].name)
          .slice(0, 3);
        const mergedOutput: AudioOutput = {
          id: 'merged',
          name: 'Merged',
          filename: `${sourceNames.join('_').replace(/[^a-z0-9_-]+/gi, '_')}_merged_audio.mp3`,
          sourceType: 'merged',
          text: '',
          audioUrl: mergedUrl,
          status: 'success',
        };
        updatedOutputs.push(mergedOutput);
        onProgress([...updatedOutputs]);
      }

      setIsProcessing(false);
      flushProgress(100);

      const successCount = updatedOutputs.filter((o) => o.status === 'success').length;
      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Generated ${successCount} audio file${successCount > 1 ? 's' : ''} successfully!`,
        });
      }

      return updatedOutputs;
    },
    [engine, apiKey, localVoiceId, sendTextForTTS, mergeBuffers, toast, flushProgress, setProgressThrottled]
  );

  /**
   * Resets all state and cleans up blob URLs
   */
  const reset = useCallback((): void => {
    cleanupBlobUrl(audioUrlRef);
    cleanupBlobUrl(testAudioUrlRef);

    setAudioUrl(null);
    setTestAudioUrl(null);
    flushProgress(0);
    setIsProcessing(false);
    setIsTesting(false);
  }, [cleanupBlobUrl, flushProgress]);

  return {
    isProcessing,
    isTesting,
    progress,
    audioUrl,
    testAudioUrl,
    convertToSpeech,
    convertMultiple,
    testVoice,
    downloadAudio,
    downloadFromUrl,
    reset,
  };
}

export default useTTS;
