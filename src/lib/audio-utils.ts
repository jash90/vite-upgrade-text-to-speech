/**
 * Audio utilities for proper audio merging using Web Audio API + lamejs MP3 encoding
 */
import lamejs from 'lamejs';

/**
 * Merges multiple audio ArrayBuffers into a single MP3 file
 * Uses Web Audio API for decoding and lamejs for MP3 encoding
 */
export async function mergeAudioBuffers(buffers: ArrayBuffer[]): Promise<Blob> {
  if (buffers.length === 0) {
    throw new Error('No audio buffers to merge');
  }

  if (buffers.length === 1) {
    // Single buffer - return as MP3 (no merge needed)
    return new Blob([buffers[0]], { type: 'audio/mp3' });
  }

  const audioContext = new AudioContext();

  try {
    // Decode all audio buffers
    const decodedBuffers: AudioBuffer[] = [];
    for (const buffer of buffers) {
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
      decodedBuffers.push(decoded);
    }

    // Calculate total length
    const totalLength = decodedBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const sampleRate = decodedBuffers[0].sampleRate;
    const numberOfChannels = decodedBuffers[0].numberOfChannels;

    // Create merged buffer
    const mergedBuffer = audioContext.createBuffer(
      numberOfChannels,
      totalLength,
      sampleRate
    );

    // Copy all audio data
    let offset = 0;
    for (const decoded of decodedBuffers) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = decoded.getChannelData(channel);
        mergedBuffer.getChannelData(channel).set(channelData, offset);
      }
      offset += decoded.length;
    }

    // Encode to MP3
    const mp3Blob = audioBufferToMp3(mergedBuffer);
    return mp3Blob;
  } finally {
    await audioContext.close();
  }
}

/**
 * Converts an AudioBuffer to MP3 format using lamejs
 */
function audioBufferToMp3(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 128; // MP3 bitrate

  // Get channel data
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

  // Convert Float32 to Int16
  const leftInt16 = floatTo16BitPCM(leftChannel);
  const rightInt16 = floatTo16BitPCM(rightChannel);

  // Create MP3 encoder
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  // Encode in chunks of 1152 samples (MP3 frame size)
  const sampleBlockSize = 1152;
  const numSamples = leftInt16.length;

  for (let i = 0; i < numSamples; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, Math.min(i + sampleBlockSize, numSamples));
    const rightChunk = rightInt16.subarray(i, Math.min(i + sampleBlockSize, numSamples));

    let mp3buf: Int8Array;
    if (numChannels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  // Flush remaining data
  const mp3End = mp3encoder.flush();
  if (mp3End.length > 0) {
    mp3Data.push(new Uint8Array(mp3End));
  }

  // Calculate total length and merge all chunks
  const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Data) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([result.buffer], { type: 'audio/mp3' });
}

/**
 * Converts Float32Array to Int16Array for MP3 encoding
 */
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  return output;
}

/**
 * Simple concatenation for single-source audio (keeps MP3 format)
 */
export function concatenateBuffers(buffers: ArrayBuffer[]): Blob {
  return new Blob(buffers, { type: 'audio/mp3' });
}
