import { Button } from '@/components/ui/button';
import { FileText, Loader2, X } from 'lucide-react';
import type { UploadedFile } from '@/types';

interface FileListItemProps {
  file: UploadedFile;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileListItem({ file, onRemove, disabled = false }: FileListItemProps) {
  const isLoading = file.status === 'reading';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-input bg-background/50 px-3 py-2 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-sm font-medium text-foreground">
          {file.name}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(file.id)}
          disabled={disabled || isLoading}
          aria-label={`Remove ${file.name}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
