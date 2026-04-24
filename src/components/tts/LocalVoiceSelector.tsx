import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Download, Loader2, PlayCircle } from 'lucide-react';
import {
  LOCAL_VOICES,
  type LocalLang,
  type LocalVoice,
} from '@/types';
import { downloadModel, isDownloaded } from '@/lib/local-tts';

interface LocalVoiceSelectorProps {
  voiceId: string;
  lang: LocalLang;
  onLangChange: (lang: LocalLang) => void;
  onVoiceChange: (voiceId: string) => void;
  onTest: () => void;
  isTesting: boolean;
  testAudioUrl: string | null;
  disabled?: boolean;
}

const LANG_LABELS: Record<LocalLang, string> = {
  pl: 'Polski',
  en: 'English (US)',
};

export function LocalVoiceSelector({
  voiceId,
  lang,
  onLangChange,
  onVoiceChange,
  onTest,
  isTesting,
  testAudioUrl,
  disabled = false,
}: LocalVoiceSelectorProps) {
  const voices = useMemo(
    () => LOCAL_VOICES.filter((v) => v.lang === lang),
    [lang],
  );
  const active: LocalVoice | undefined = useMemo(
    () => LOCAL_VOICES.find((v) => v.voiceId === voiceId),
    [voiceId],
  );

  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDownloadError(null);
    setDownloadProgress(null);
    isDownloaded(voiceId)
      .then((ok) => {
        if (!cancelled) setDownloaded(ok);
      })
      .catch(() => {
        if (!cancelled) setDownloaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [voiceId]);

  const handleDownload = async () => {
    setDownloadError(null);
    setDownloadProgress(0);
    try {
      await downloadModel(voiceId, (p) => {
        if (p.total > 0) {
          setDownloadProgress(Math.round((p.loaded / p.total) * 100));
        }
      });
      setDownloaded(true);
      setDownloadProgress(100);
      setTimeout(() => setDownloadProgress(null), 600);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
      setDownloadProgress(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Language
        </label>
        <Select
          value={lang}
          onValueChange={(v) => onLangChange(v as LocalLang)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LANG_LABELS) as LocalLang[]).map((code) => (
              <SelectItem key={code} value={code}>
                {LANG_LABELS[code]}
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
          <Select value={voiceId} onValueChange={onVoiceChange} disabled={disabled}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem key={v.voiceId} value={v.voiceId}>
                  {v.label} · ~{v.sizeMB} MB
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            onClick={onTest}
            disabled={disabled || isTesting || !downloaded}
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

      <div className="space-y-2">
        {downloaded ? (
          <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 p-2 text-xs">
            <span className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Check className="h-4 w-4" />
              Model downloaded and cached (OPFS)
            </span>
            <span className="text-green-700 dark:text-green-300">
              {active?.label ?? voiceId}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={disabled || downloadProgress !== null}
              className="w-full"
            >
              {downloadProgress !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading… {downloadProgress}%
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download model ({active?.sizeMB ?? '~60'} MB, one-time)
                </>
              )}
            </Button>
            {downloadProgress !== null && (
              <Progress value={downloadProgress} />
            )}
            {downloadError && (
              <p className="text-xs text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </div>
        )}
      </div>

      {testAudioUrl && (
        <audio controls className="w-full" src={testAudioUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
