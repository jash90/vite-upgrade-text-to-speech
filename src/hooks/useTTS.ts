import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import type { VoiceType, AudioOutput } from '@/types';
import { splitTextIntoChunks, removeExtraWhitespaces } from '@/lib/text-processing';
import { mergeAudioBuffers, concatenateBuffers } from '@/lib/audio-utils';

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const TTS_MODEL = 'tts-1';
const CHUNK_SIZE = 4000;
const TEST_TEXT = 'This is a test of the selected voice.';

interface UseTTSParams {
  apiKey: string;
  voice: VoiceType;
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
export function useTTS({ apiKey, voice }: UseTTSParams): UseTTSResult {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);

  const { toast } = useToast();

  // Track blob URLs for cleanup
  const audioUrlRef = useRef<string | null>(null);
  const testAudioUrlRef = useRef<string | null>(null);

  /**
   * Sends a text chunk to OpenAI TTS API and returns audio buffer
   */
  const sendTextForTTS = useCallback(
    async (text: string, chunkIndex: number): Promise<ArrayBuffer | null> => {
      try {
        const response = await axios.post<ArrayBuffer>(
          OPENAI_TTS_ENDPOINT,
          {
            model: TTS_MODEL,
            input: text,
            voice: voice,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
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
    [apiKey, voice, toast]
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
    if (buffers.length === 1) {
      return concatenateBuffers(buffers);
    }
    return mergeAudioBuffers(buffers);
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

      setProgress(0);
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
          const audioData = await sendTextForTTS(chunks[i], i);

          if (audioData) {
            audioBuffers.push(audioData);
          } else {
            throw new Error(`Failed to generate audio for chunk ${i + 1}`);
          }

          // Update progress based on chunks processed
          const currentProgress = Math.min(100, Math.floor(((i + 1) / totalChunks) * 100));
          setProgress(currentProgress);
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
        setProgress(100);
      }
    },
    [apiKey, sendTextForTTS, cleanupBlobUrl, mergeBuffers, toast]
  );

  /**
   * Tests the selected voice with sample text
   */
  const testVoice = useCallback(async (): Promise<void> => {
    if (!apiKey) {
      toast({
        title: 'Error',
        description: 'Please enter your OpenAI API key.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);

    // Clean up previous test audio URL
    cleanupBlobUrl(testAudioUrlRef);
    setTestAudioUrl(null);

    try {
      const audioData = await sendTextForTTS(TEST_TEXT, 0);

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
  }, [apiKey, sendTextForTTS, cleanupBlobUrl, toast]);

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
      link.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
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
      if (!apiKey) {
        toast({
          title: 'Error',
          description: 'Please enter your OpenAI API key.',
          variant: 'destructive',
        });
        return outputs;
      }

      setIsProcessing(true);
      setProgress(0);

      const updatedOutputs = [...outputs];
      const totalItems = outputs.length;
      let completedItems = 0;

      for (let i = 0; i < updatedOutputs.length; i++) {
        const output = updatedOutputs[i];

        // Skip if no text
        if (!output.text || output.text.trim().length === 0) {
          updatedOutputs[i] = { ...output, status: 'error', error: 'No text to convert' };
          onProgress([...updatedOutputs]);
          continue;
        }

        // Update status to processing
        updatedOutputs[i] = { ...output, status: 'processing' };
        onProgress([...updatedOutputs]);

        try {
          const cleanedText = removeExtraWhitespaces(output.text);
          const chunks = splitTextIntoChunks(cleanedText, CHUNK_SIZE);
          const audioBuffers: ArrayBuffer[] = [];

          for (let j = 0; j < chunks.length; j++) {
            const audioData = await sendTextForTTS(chunks[j], j);

            if (audioData) {
              audioBuffers.push(audioData);
            } else {
              throw new Error(`Failed to generate audio for chunk ${j + 1}`);
            }
          }

          // Merge audio buffers and create URL
          const mergedAudioBlob = await mergeBuffers(audioBuffers);
          const newAudioUrl = URL.createObjectURL(mergedAudioBlob);

          updatedOutputs[i] = { ...output, status: 'success', audioUrl: newAudioUrl };
          completedItems++;

          // Update overall progress
          setProgress(Math.floor((completedItems / totalItems) * 100));
          onProgress([...updatedOutputs]);
        } catch (error) {
          console.error(`Error processing ${output.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          updatedOutputs[i] = { ...output, status: 'error', error: errorMessage };
          onProgress([...updatedOutputs]);
        }
      }

      setIsProcessing(false);
      setProgress(100);

      const successCount = updatedOutputs.filter(o => o.status === 'success').length;
      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Generated ${successCount} audio file${successCount > 1 ? 's' : ''} successfully!`,
        });
      }

      return updatedOutputs;
    },
    [apiKey, sendTextForTTS, mergeBuffers, toast]
  );

  /**
   * Resets all state and cleans up blob URLs
   */
  const reset = useCallback((): void => {
    cleanupBlobUrl(audioUrlRef);
    cleanupBlobUrl(testAudioUrlRef);

    setAudioUrl(null);
    setTestAudioUrl(null);
    setProgress(0);
    setIsProcessing(false);
    setIsTesting(false);
  }, [cleanupBlobUrl]);

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
