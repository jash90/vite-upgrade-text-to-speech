import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { UploadedFile, MAX_FILES } from '@/types';
import {
  validateFile,
  readFileAsText,
  generateFileId,
  formatFileSize,
} from '@/lib/file-utils';

interface UseFileUploadResult {
  files: UploadedFile[];
  isLoading: boolean;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  mergedContent: string;
  totalSize: number;
}

/**
 * Custom hook for handling multiple .txt file uploads
 *
 * Features:
 * - Validates file type (.txt only) and size (max 5MB)
 * - Reads file contents using FileReader
 * - Tracks upload status per file
 * - Supports file removal and clearing all files
 * - Merges all file contents into a single string
 *
 * @returns File upload controls and state
 */
export function useFileUpload(): UseFileUploadResult {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { toast } = useToast();

  /**
   * Calculates total size of all uploaded files
   */
  const totalSize = useMemo(() => {
    return files.reduce((sum, file) => sum + file.size, 0);
  }, [files]);

  /**
   * Merges all successfully read file contents into a single string
   */
  const mergedContent = useMemo(() => {
    return files
      .filter((file) => file.status === 'success' && file.content)
      .map((file) => file.content.trim())
      .filter((content) => content.length > 0)
      .join('\n\n');
  }, [files]);

  /**
   * Processes a single file: validates, reads, and updates state
   */
  const processFile = useCallback(
    async (file: File): Promise<UploadedFile> => {
      const fileId = generateFileId();

      // Create initial file entry with pending status
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        content: '',
        status: 'pending',
      };

      // Validate the file
      const validation = validateFile(file);
      if (!validation.valid) {
        return {
          ...uploadedFile,
          status: 'error',
          error: validation.error,
        };
      }

      // Update status to reading
      uploadedFile.status = 'reading';

      try {
        // Read file contents
        const content = await readFileAsText(file);

        return {
          ...uploadedFile,
          content,
          status: 'success',
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to read file';

        return {
          ...uploadedFile,
          status: 'error',
          error: errorMessage,
        };
      }
    },
    []
  );

  /**
   * Adds multiple files for processing
   * Validates each file and reads its contents
   */
  const addFiles = useCallback(
    async (fileInput: FileList | File[]): Promise<void> => {
      const fileArray = Array.from(fileInput);

      if (fileArray.length === 0) {
        return;
      }

      // Check if adding these files would exceed the maximum
      const currentCount = files.length;
      const availableSlots = MAX_FILES - currentCount;

      if (availableSlots <= 0) {
        toast({
          title: 'Error',
          description: `Maximum of ${MAX_FILES} files allowed.`,
          variant: 'destructive',
        });
        return;
      }

      // Limit files to available slots
      const filesToProcess = fileArray.slice(0, availableSlots);

      if (filesToProcess.length < fileArray.length) {
        toast({
          title: 'Warning',
          description: `Only ${filesToProcess.length} of ${fileArray.length} files will be added (max ${MAX_FILES} files).`,
        });
      }

      setIsLoading(true);

      try {
        // Process all files in parallel
        const processedFiles = await Promise.all(
          filesToProcess.map((file) => processFile(file))
        );

        // Check for any errors
        const errorFiles = processedFiles.filter((f) => f.status === 'error');
        const successFiles = processedFiles.filter((f) => f.status === 'success');

        if (errorFiles.length > 0) {
          toast({
            title: 'Some files failed',
            description:
              errorFiles.length === 1
                ? errorFiles[0].error
                : `${errorFiles.length} files failed to upload. Check the file list for details.`,
            variant: 'destructive',
          });
        }

        if (successFiles.length > 0) {
          const totalNewSize = successFiles.reduce((sum, f) => sum + f.size, 0);

          toast({
            title: 'Files uploaded',
            description: `${successFiles.length} file(s) uploaded (${formatFileSize(totalNewSize)}).`,
          });
        }

        // Add all processed files (including errors for user visibility)
        setFiles((prevFiles) => [...prevFiles, ...processedFiles]);
      } catch (error) {
        console.error('Error processing files:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while processing files.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [files.length, processFile, toast]
  );

  /**
   * Removes a file by its ID
   */
  const removeFile = useCallback((fileId: string): void => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
  }, []);

  /**
   * Clears all uploaded files
   */
  const clearFiles = useCallback((): void => {
    setFiles([]);
  }, []);

  return {
    files,
    isLoading,
    addFiles,
    removeFile,
    clearFiles,
    mergedContent,
    totalSize,
  };
}

export default useFileUpload;
