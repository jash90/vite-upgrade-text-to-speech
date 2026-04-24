import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, PlayCircle } from 'lucide-react';
import {
  MODEL_OPTIONS,
  VOICE_OPTIONS,
  type ModelType,
  type VoiceType,
} from '@/types';

interface VoiceSelectorProps {
  model: ModelType;
  voice: VoiceType;
  onModelChange: (model: ModelType) => void;
  onVoiceChange: (voice: VoiceType) => void;
  onTest: () => void;
  isTesting: boolean;
  testAudioUrl: string | null;
  disabled?: boolean;
}

export function VoiceSelector({
  model,
  voice,
  onModelChange,
  onVoiceChange,
  onTest,
  isTesting,
  testAudioUrl,
  disabled = false,
}: VoiceSelectorProps) {
  const activeModel = useMemo(
    () => MODEL_OPTIONS.find((m) => m.value === model) ?? MODEL_OPTIONS[0],
    [model],
  );

  const availableVoices = useMemo(
    () => VOICE_OPTIONS.filter((v) => activeModel.voices.includes(v.value)),
    [activeModel],
  );

  const handleModelChange = (next: string) => {
    const nextModel = next as ModelType;
    onModelChange(nextModel);
    const target = MODEL_OPTIONS.find((m) => m.value === nextModel);
    if (target && !target.voices.includes(voice)) {
      onVoiceChange(target.voices[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Model
        </label>
        <Select value={model} onValueChange={handleModelChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Voice
        </label>
        <div className="flex items-center gap-2">
          <Select
            value={voice}
            onValueChange={(val) => onVoiceChange(val as VoiceType)}
            disabled={disabled}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {availableVoices.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            onClick={onTest}
            disabled={disabled || isTesting}
            className="shrink-0"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Test Voice
              </>
            )}
          </Button>
        </div>
      </div>

      {testAudioUrl && (
        <audio controls className="w-full" src={testAudioUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
