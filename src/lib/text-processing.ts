import { CHUNK_SIZE } from '@/types';

/**
 * Text processing utilities for TTS conversion
 */

/**
 * Removes extra whitespaces from text, replacing multiple spaces with single space
 */
export function removeExtraWhitespaces(text: string): string {
  return text.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Generator function that yields text chunks of approximately CHUNK_SIZE characters.
 * Chunks are split at sentence boundaries (periods) when possible to maintain
 * natural reading flow.
 *
 * @param text - The text to chunk
 * @yields Text chunks with sentence boundary awareness
 * @throws Error if a sentence exceeds the chunk size limit
 */
export function* chunkText(text: string): Generator<string, void, unknown> {
  const normalizedText = removeExtraWhitespaces(text);
  let currentIndex = 0;

  while (currentIndex < normalizedText.length) {
    let endIndex = currentIndex + CHUNK_SIZE;

    // If we're not at the end of the text, try to find a sentence boundary
    if (endIndex < normalizedText.length) {
      // Look for the last period before the chunk boundary
      const periodIndex = normalizedText.lastIndexOf('.', endIndex);

      if (periodIndex > currentIndex) {
        // Found a period within the chunk, use it as the boundary
        endIndex = periodIndex + 1;
      } else {
        // No period found before the boundary, look for the next one
        const nextPeriodIndex = normalizedText.indexOf('.', endIndex);

        if (nextPeriodIndex === -1 || nextPeriodIndex - currentIndex > CHUNK_SIZE) {
          throw new Error('Sentence exceeds chunk size limit of 4000 characters.');
        }

        endIndex = nextPeriodIndex + 1;
      }
    }

    const chunk = normalizedText.slice(currentIndex, endIndex).trim();

    if (chunk.length > 0) {
      yield chunk;
    }

    currentIndex = endIndex;
  }
}

/**
 * Splits text into chunks respecting sentence boundaries
 * @param text - The text to split
 * @param maxChunkSize - Maximum size of each chunk (default: 4000)
 * @returns Array of text chunks
 * @throws Error if a sentence exceeds the chunk size limit
 */
export function splitTextIntoChunks(text: string, maxChunkSize: number = CHUNK_SIZE): string[] {
  const cleanedText = removeExtraWhitespaces(text);
  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < cleanedText.length) {
    let endIndex = currentIndex + maxChunkSize;

    if (endIndex < cleanedText.length) {
      // Try to find the last period within the chunk
      const periodIndex = cleanedText.lastIndexOf('.', endIndex);

      if (periodIndex > currentIndex) {
        endIndex = periodIndex + 1;
      } else {
        // If no period found before, look for the next period
        const nextPeriodIndex = cleanedText.indexOf('.', endIndex);

        if (nextPeriodIndex === -1 || nextPeriodIndex - currentIndex > maxChunkSize * 1.5) {
          throw new Error(
            `Sentence exceeds chunk size limit of ${maxChunkSize} characters. ` +
            `Consider adding sentence breaks to your text.`
          );
        }
        endIndex = nextPeriodIndex + 1;
      }
    }

    const chunk = cleanedText.slice(currentIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    currentIndex = endIndex;
  }

  return chunks;
}

/**
 * Splits text into chunks for local (Piper) synthesis.
 *
 * Unlike `splitTextIntoChunks`, this never throws — Piper summaries often
 * contain long clauses with no periods, and the caller needs a guaranteed
 * chunking. Boundary priority per chunk: sentence end (.!?), clause break
 * (;:), whitespace, then hard cut.
 */
export function splitTextForLocalTTS(text: string, maxChunkSize: number): string[] {
  const cleanedText = removeExtraWhitespaces(text);
  if (cleanedText.length <= maxChunkSize) {
    return cleanedText ? [cleanedText] : [];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < cleanedText.length) {
    const remaining = cleanedText.length - cursor;
    if (remaining <= maxChunkSize) {
      chunks.push(cleanedText.slice(cursor).trim());
      break;
    }

    const windowEnd = cursor + maxChunkSize;
    const window = cleanedText.slice(cursor, windowEnd);

    let breakAt = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
      window.lastIndexOf('.\n'),
      window.lastIndexOf('!\n'),
      window.lastIndexOf('?\n'),
    );

    if (breakAt < maxChunkSize * 0.3) {
      breakAt = Math.max(window.lastIndexOf('; '), window.lastIndexOf(': '), window.lastIndexOf(', '));
    }

    if (breakAt < maxChunkSize * 0.3) {
      breakAt = window.lastIndexOf(' ');
    }

    const cutLen = breakAt > 0 ? breakAt + 1 : maxChunkSize;
    const piece = cleanedText.slice(cursor, cursor + cutLen).trim();
    if (piece) chunks.push(piece);
    cursor += cutLen;
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Calculates the number of chunks a text will be split into
 */
export function estimateChunkCount(text: string, maxChunkSize: number = 4000): number {
  const cleanedText = removeExtraWhitespaces(text);
  return Math.ceil(cleanedText.length / maxChunkSize);
}

/**
 * Validates that text is suitable for TTS conversion
 */
export function validateTextForTTS(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }

  const cleanedText = removeExtraWhitespaces(text);

  if (cleanedText.length > 100000) {
    return { valid: false, error: 'Text exceeds maximum length of 100,000 characters' };
  }

  return { valid: true };
}
