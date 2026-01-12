import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, PlayCircle } from 'lucide-react';
import { VOICE_OPTIONS, type VoiceType } from '@/types';

interface VoiceSelectorProps {
  value: VoiceType;
  onChange: (voice: VoiceType) => void;
  onTest: () => void;
  isTesting: boolean;
  testAudioUrl: string | null;
  disabled?: boolean;
}

export function VoiceSelector({
  value,
  onChange,
  onTest,
  isTesting,
  testAudioUrl,
  disabled = false,
}: VoiceSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select
          value={value}
          onValueChange={(val) => onChange(val as VoiceType)}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {VOICE_OPTIONS.map((option) => (
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
      {testAudioUrl && (
        <audio controls className="w-full">
          <source src={testAudioUrl} type="audio/mp3" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
