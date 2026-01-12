import { Button } from '@/components/ui/button';
import { Download, Play, Pause, FileAudio, Loader2, AlertCircle, Files } from 'lucide-react';
import type { AudioOutput } from '@/types';
import { useState, useRef, useEffect } from 'react';

interface AudioOutputListProps {
  outputs: AudioOutput[];
  onDownload: (url: string, filename: string) => void;
}

function AudioOutputItem({
  output,
  onDownload,
}: {
  output: AudioOutput;
  onDownload: (url: string, filename: string) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!output.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(output.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const getStatusIcon = () => {
    switch (output.status) {
      case 'pending':
        return <FileAudio className="h-5 w-5 text-gray-400" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return output.sourceType === 'merged'
          ? <Files className="h-5 w-5 text-purple-500" />
          : <FileAudio className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileAudio className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (output.status) {
      case 'pending':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Pending</span>;
      case 'processing':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">Processing...</span>;
      case 'success':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">Ready</span>;
      case 'error':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300">Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      output.sourceType === 'merged'
        ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700'
        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    }`}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {output.sourceType === 'merged' ? 'Merged Audio' : output.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {output.filename}
          </span>
          {output.error && (
            <span className="text-xs text-red-500">{output.error}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {getStatusBadge()}

        {output.status === 'success' && output.audioUrl && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePlayPause}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onDownload(output.audioUrl!, output.filename)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function AudioOutputList({ outputs, onDownload }: AudioOutputListProps) {
  if (outputs.length === 0) {
    return null;
  }

  const successCount = outputs.filter(o => o.status === 'success').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Generated Audio Files
        </h3>
        {successCount > 0 && (
          <span className="text-sm text-green-600 dark:text-green-400">
            {successCount} of {outputs.length} ready
          </span>
        )}
      </div>

      <div className="space-y-2">
        {outputs.map((output) => (
          <AudioOutputItem
            key={output.id}
            output={output}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
}
