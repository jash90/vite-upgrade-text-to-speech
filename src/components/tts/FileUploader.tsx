import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
}

export function FileUploader({
  onFilesSelected,
  disabled = false,
  accept = '.txt',
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      onFilesSelected(Array.from(fileList));
      // Reset input to allow selecting the same file again
      event.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={disabled}
        className="w-full border-dashed"
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Files
      </Button>
    </>
  );
}
