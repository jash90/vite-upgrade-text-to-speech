import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  progress: number;
  isVisible: boolean;
}

export function ProgressIndicator({ progress, isVisible }: ProgressIndicatorProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Progress value={progress} className="w-full" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-center text-xs text-muted-foreground">
          {progress}% complete
        </p>
      </div>
    </div>
  );
}
