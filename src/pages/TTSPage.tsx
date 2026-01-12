import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import {
  TextInputSection,
  ApiKeyInput,
  VoiceSelector,
  ConvertButton,
  ProgressIndicator,
  AudioOutputList,
} from '@/components/tts';
import { useTTS, useFileUpload } from '@/hooks';
import type { VoiceType, AudioOutput } from '@/types';

/**
 * Main Text-to-Speech page component
 *
 * Features:
 * - Direct text input via textarea
 * - Multiple .txt file upload support
 * - Voice selection with preview
 * - Progress tracking during conversion
 * - Audio playback and download
 */
const API_KEY_STORAGE_KEY = 'openai-api-key';

export default function TTSPage() {
  // Local state for user inputs
  const [inputText, setInputText] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  });
  const [voice, setVoice] = useState<VoiceType>('alloy');

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }
  }, [apiKey]);

  // File upload hook
  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    mergedContent: fileContent,
  } = useFileUpload();

  // Audio outputs state
  const [audioOutputs, setAudioOutputs] = useState<AudioOutput[]>([]);

  // TTS conversion hook
  const {
    isProcessing,
    isTesting,
    progress,
    testAudioUrl,
    convertMultiple,
    testVoice,
    downloadFromUrl,
  } = useTTS({ apiKey, voice });

  /**
   * Handles the convert button click
   * Creates individual audio for each file + merged audio if 2+ files
   */
  const handleConvert = async () => {
    const outputs: AudioOutput[] = [];
    const successFiles = files.filter(f => f.status === 'success');

    // If we have files, create individual outputs for each
    if (successFiles.length > 0) {
      successFiles.forEach(file => {
        outputs.push({
          id: file.id,
          name: file.name.replace(/\.txt$/i, ''),
          filename: `${file.name.replace(/\.txt$/i, '')}_audio.mp3`,
          sourceType: 'file',
          text: file.content,
          audioUrl: null,
          status: 'pending',
        });
      });

      // Add merged output if 2+ files
      if (successFiles.length >= 2) {
        const mergedText = successFiles.map(f => f.content).join('\n\n');
        const baseNames = successFiles
          .map(f => f.name.replace(/\.txt$/i, ''))
          .slice(0, 3);
        outputs.push({
          id: 'merged',
          name: 'Merged',
          filename: `${baseNames.join('_')}_merged_audio.mp3`,
          sourceType: 'merged',
          text: mergedText,
          audioUrl: null,
          status: 'pending',
        });
      }
    }

    // If we have text input (no files or combined with files), add text output
    if (inputText.trim() && successFiles.length === 0) {
      outputs.push({
        id: 'text-input',
        name: 'Text Input',
        filename: 'text_input_audio.mp3',
        sourceType: 'text',
        text: inputText.trim(),
        audioUrl: null,
        status: 'pending',
      });
    }

    // If we have both text input and files, include text in merged
    if (inputText.trim() && successFiles.length > 0) {
      // Add text input as separate output
      outputs.unshift({
        id: 'text-input',
        name: 'Text Input',
        filename: 'text_input_audio.mp3',
        sourceType: 'text',
        text: inputText.trim(),
        audioUrl: null,
        status: 'pending',
      });

      // Update merged to include text input
      const mergedOutput = outputs.find(o => o.sourceType === 'merged');
      if (mergedOutput) {
        mergedOutput.text = [inputText.trim(), ...successFiles.map(f => f.content)].join('\n\n');
        mergedOutput.filename = `all_merged_audio.mp3`;
      } else if (successFiles.length === 1) {
        // Create merged if we have text + 1 file
        const mergedText = [inputText.trim(), successFiles[0].content].join('\n\n');
        outputs.push({
          id: 'merged',
          name: 'Merged',
          filename: `text_${successFiles[0].name.replace(/\.txt$/i, '')}_merged_audio.mp3`,
          sourceType: 'merged',
          text: mergedText,
          audioUrl: null,
          status: 'pending',
        });
      }
    }

    setAudioOutputs(outputs);
    await convertMultiple(outputs, setAudioOutputs);
  };

  /**
   * Handles file selection from the FileUploader
   */
  const handleFilesAdd = async (newFiles: File[]) => {
    await addFiles(newFiles);
  };

  // Combine all text sources for preview and conversion
  const combinedText = [inputText.trim(), fileContent]
    .filter(Boolean)
    .join('\n\n');

  // Determine if convert button should be disabled
  const hasContent = combinedText.length > 0;
  const canConvert = hasContent && apiKey.length > 0 && !isProcessing;

  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
            Text-to-Speech Converter
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Convert your text into natural-sounding speech using OpenAI's advanced TTS technology.
            Enter text directly or upload .txt files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Text Input Section with File Upload */}
          <TextInputSection
            text={inputText}
            onTextChange={setInputText}
            files={files}
            onFilesAdd={handleFilesAdd}
            onFileRemove={removeFile}
            onFilesClear={clearFiles}
            disabled={isProcessing}
          />

          {/* API Key Input */}
          <ApiKeyInput
            value={apiKey}
            onChange={setApiKey}
            disabled={isProcessing}
          />

          {/* Voice Selector with Test */}
          <VoiceSelector
            value={voice}
            onChange={setVoice}
            onTest={testVoice}
            isTesting={isTesting}
            testAudioUrl={testAudioUrl}
            disabled={isProcessing}
          />

          {/* Preview of merged text to be converted */}
          {combinedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Text to convert ({combinedText.length} characters):
                </span>
                {files.length > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {files.filter(f => f.status === 'success').length} file(s) merged
                  </span>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 border rounded-md p-3 max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                  {combinedText.slice(0, 500)}{combinedText.length > 500 ? '...' : ''}
                </pre>
              </div>
            </div>
          )}

          {/* Convert Button */}
          <ConvertButton
            onClick={handleConvert}
            isProcessing={isProcessing}
            disabled={!canConvert}
          />

          {/* Progress Indicator */}
          <ProgressIndicator
            progress={progress}
            isVisible={isProcessing}
          />

          {/* Audio Output List */}
          <AudioOutputList
            outputs={audioOutputs}
            onDownload={downloadFromUrl}
          />
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
