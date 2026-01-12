import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FileListItem } from './FileListItem';
import type { UploadedFile } from '@/types';

interface FileListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

function formatTotalSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileList({ files, onRemove, onClear, disabled = false }: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{files.length}</span>
          {' '}file{files.length !== 1 ? 's' : ''} ({formatTotalSize(totalSize)})
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={onClear}
          disabled={disabled}
        >
          <X className="mr-1 h-3 w-3" />
          Clear All
        </Button>
      </div>
      <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-input bg-muted/30 p-2">
        {files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            onRemove={onRemove}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
