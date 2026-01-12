import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  onDownload: () => void;
  title?: string;
}

export function AudioPlayer({
  audioUrl,
  onDownload,
  title = 'Generated Audio:',
}: AudioPlayerProps) {
  if (!audioUrl) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        {title}
      </h3>
      <audio controls className="w-full">
        <source src={audioUrl} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <Button
        type="button"
        onClick={onDownload}
        className="w-full bg-green-500 font-semibold text-white shadow-md transition duration-300 ease-in-out hover:bg-green-600 hover:scale-105"
      >
        <Download className="mr-2 h-4 w-4" />
        Download Audio
      </Button>
    </div>
  );
}
