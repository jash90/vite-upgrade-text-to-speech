import { Textarea } from '@/components/ui/textarea';
import { FileList } from './FileList';
import { FileUploader } from './FileUploader';
import type { UploadedFile } from '@/types';

interface TextInputSectionProps {
  text: string;
  onTextChange: (text: string) => void;
  files: UploadedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onFilesClear: () => void;
  disabled?: boolean;
}

export function TextInputSection({
  text,
  onTextChange,
  files,
  onFilesAdd,
  onFileRemove,
  onFilesClear,
  disabled = false,
}: TextInputSectionProps) {
  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Enter your text here or upload text files below..."
        className="min-h-[200px] resize-none"
        disabled={disabled}
      />
      <div className="space-y-3">
        <FileUploader
          onFilesSelected={onFilesAdd}
          disabled={disabled}
          accept=".txt"
        />
        <FileList
          files={files}
          onRemove={onFileRemove}
          onClear={onFilesClear}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
