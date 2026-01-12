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
      <p className="text-center text-sm text-muted-foreground">
        {progress}% complete
      </p>
    </div>
  );
}
