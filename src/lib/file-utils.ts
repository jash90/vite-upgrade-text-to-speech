import { MAX_FILE_SIZE } from '@/types';

/**
 * Generates a unique file identifier.
 * Uses crypto.randomUUID() if available, otherwise falls back to Date.now().
 */
export function generateFileId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Reads a File object and returns its contents as text.
 *
 * @param file - The File object to read
 * @returns Promise resolving to the file contents as a string
 * @throws Error if file reading fails
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message ?? 'Unknown error'}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Formats a byte count into a human-readable string.
 *
 * @param bytes - The number of bytes to format
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(1)} MB`;
}

/**
 * Validation result for file upload.
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file for upload.
 * Checks that the file is a .txt file and within the size limit.
 *
 * @param file - The File object to validate
 * @returns Validation result with error message if invalid
 */
export function validateFile(file: File): FileValidationResult {
  // Check file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.txt')) {
    return {
      valid: false,
      error: 'Only .txt files are allowed',
    };
  }

  // Check file type (MIME type)
  if (file.type && file.type !== 'text/plain') {
    return {
      valid: false,
      error: 'Only text files are allowed',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeFormatted = formatFileSize(MAX_FILE_SIZE);
    const fileSizeFormatted = formatFileSize(file.size);
    return {
      valid: false,
      error: `File size (${fileSizeFormatted}) exceeds maximum allowed size (${maxSizeFormatted})`,
    };
  }

  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Extracts the file extension from a filename.
 *
 * @param filename - The filename to extract extension from
 * @returns The file extension (without dot) or empty string if none
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDotIndex + 1).toLowerCase();
}
