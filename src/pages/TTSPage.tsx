import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import {
  TextInputSection,
  ApiKeyInput,
  EngineSelector,
  VoiceSelector,
  LocalVoiceSelector,
  ConvertButton,
  ProgressIndicator,
  AudioOutputList,
} from '@/components/tts';
import { useTTS, useFileUpload } from '@/hooks';
import { estimateCost, formatCount, formatUsd } from '@/lib/pricing';
import {
  DEFAULT_ENGINE,
  DEFAULT_LOCAL_LANG,
  DEFAULT_LOCAL_VOICE_ID,
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  LOCAL_VOICES,
  type AudioOutput,
  type LocalLang,
  type ModelType,
  type TTSEngine,
  type VoiceType,
} from '@/types';

const API_KEY_STORAGE_KEY = 'openai-api-key';

export default function TTSPage() {
  const [inputText, setInputText] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  });
  const [engine, setEngine] = useState<TTSEngine>(DEFAULT_ENGINE);
  const [model, setModel] = useState<ModelType>(DEFAULT_MODEL);
  const [voice, setVoice] = useState<VoiceType>(DEFAULT_VOICE);
  const [localLang, setLocalLang] = useState<LocalLang>(DEFAULT_LOCAL_LANG);
  const [localVoiceId, setLocalVoiceId] = useState<string>(DEFAULT_LOCAL_VOICE_ID);

  useEffect(() => {
    if (apiKey) localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  }, [apiKey]);

  // Keep local voice in sync with language selection.
  useEffect(() => {
    const current = LOCAL_VOICES.find((v) => v.voiceId === localVoiceId);
    if (!current || current.lang !== localLang) {
      const next = LOCAL_VOICES.find((v) => v.lang === localLang);
      if (next) setLocalVoiceId(next.voiceId);
    }
  }, [localLang, localVoiceId]);

  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    mergedContent: fileContent,
  } = useFileUpload();

  const [audioOutputs, setAudioOutputs] = useState<AudioOutput[]>([]);

  const {
    isProcessing,
    isTesting,
    progress,
    testAudioUrl,
    convertMultiple,
    testVoice,
    downloadFromUrl,
  } = useTTS({ engine, apiKey, voice, model, localVoiceId });

  const handleConvert = async () => {
    const outputs: AudioOutput[] = [];
    const successFiles = files.filter((f) => f.status === 'success');
    const trimmedText = inputText.trim();

    if (trimmedText) {
      outputs.push({
        id: 'text-input',
        name: 'Text Input',
        filename: 'text_input_audio.mp3',
        sourceType: 'text',
        text: trimmedText,
        audioUrl: null,
        status: 'pending',
      });
    }

    successFiles.forEach((file) => {
      const base = file.name.replace(/\.txt$/i, '');
      outputs.push({
        id: file.id,
        name: base,
        filename: `${base}_audio.mp3`,
        sourceType: 'file',
        text: file.content,
        audioUrl: null,
        status: 'pending',
      });
    });

    if (outputs.length === 0) return;

    setAudioOutputs(outputs);
    await convertMultiple(outputs, setAudioOutputs);
  };

  const handleFilesAdd = async (newFiles: File[]) => {
    await addFiles(newFiles);
  };

  const combinedText = [inputText.trim(), fileContent].filter(Boolean).join('\n\n');

  const hasContent = combinedText.length > 0;
  const needsKey = engine === 'openai' && apiKey.length === 0;
  const canConvert = hasContent && !needsKey && !isProcessing;
  const costEstimate = hasContent && engine === 'openai' ? estimateCost(model, combinedText.length) : null;

  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
            Text-to-Speech Converter
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Convert your text into natural-sounding speech. Pick OpenAI's cloud voices or
            run Piper VITS offline in your browser (Polish &amp; English).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextInputSection
            text={inputText}
            onTextChange={setInputText}
            files={files}
            onFilesAdd={handleFilesAdd}
            onFileRemove={removeFile}
            onFilesClear={clearFiles}
            disabled={isProcessing}
          />

          <EngineSelector value={engine} onChange={setEngine} disabled={isProcessing} />

          {engine === 'openai' && (
            <>
              <ApiKeyInput value={apiKey} onChange={setApiKey} disabled={isProcessing} />
              <VoiceSelector
                model={model}
                voice={voice}
                onModelChange={setModel}
                onVoiceChange={setVoice}
                onTest={testVoice}
                isTesting={isTesting}
                testAudioUrl={testAudioUrl}
                disabled={isProcessing}
              />
            </>
          )}

          {engine === 'local' && (
            <LocalVoiceSelector
              voiceId={localVoiceId}
              lang={localLang}
              onLangChange={setLocalLang}
              onVoiceChange={setLocalVoiceId}
              onTest={testVoice}
              isTesting={isTesting}
              testAudioUrl={testAudioUrl}
              disabled={isProcessing}
            />
          )}

          {combinedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Text to convert ({formatCount(combinedText.length)} characters):
                </span>
                {files.length > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {files.filter((f) => f.status === 'success').length} file(s) ready
                  </span>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 border rounded-md p-3 max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                  {combinedText.slice(0, 500)}
                  {combinedText.length > 500 ? '...' : ''}
                </pre>
              </div>

              {engine === 'local' && (
                <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-md p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-800 dark:text-green-200">
                      Estimated cost
                    </span>
                    <span className="font-mono font-semibold text-green-900 dark:text-green-100">
                      Free · offline
                    </span>
                  </div>
                  <div className="text-green-700 dark:text-green-300 pt-1">
                    Piper VITS runs fully in your browser. No API calls after the model is cached.
                  </div>
                </div>
              )}

              {costEstimate && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      Estimated cost
                    </span>
                    <span className="font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatUsd(costEstimate.estimatedUsdCost)}
                    </span>
                  </div>
                  {costEstimate.billingBasis === 'characters' ? (
                    <div className="text-blue-700 dark:text-blue-300">
                      {formatCount(costEstimate.characters)} chars ×{' '}
                      ${costEstimate.pricePerMillionUsd}/1M ({costEstimate.model})
                    </div>
                  ) : (
                    <div className="text-blue-700 dark:text-blue-300 space-y-0.5">
                      <div>
                        Input: ~{formatCount(costEstimate.inputTokens!)} text tokens × $0.60/1M
                      </div>
                      <div>
                        Output: ~{formatCount(costEstimate.audioTokens!)} audio tokens × $12/1M
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 pt-1 border-t border-blue-200 dark:border-blue-800">
                    Estimate only — actual billing is what OpenAI charges. Pricing verified Apr 2026.
                  </div>
                </div>
              )}
            </div>
          )}

          <ConvertButton
            onClick={handleConvert}
            isProcessing={isProcessing}
            disabled={!canConvert}
          />

          <ProgressIndicator progress={progress} isVisible={isProcessing} />

          <AudioOutputList outputs={audioOutputs} onDownload={downloadFromUrl} />
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
