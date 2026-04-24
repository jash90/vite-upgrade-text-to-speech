import type { ModelType } from '@/types';

export interface CostEstimate {
  model: ModelType;
  characters: number;
  estimatedUsdCost: number;
  billingBasis: 'characters' | 'tokens';
  pricePerMillionUsd?: number;
  inputTokens?: number;
  audioTokens?: number;
}

// OpenAI TTS pricing — verified April 2026.
// Sources: https://openai.com/api/pricing and developers.openai.com/api/docs/pricing
export const PRICING = {
  'tts-1': { perMillionChars: 15 },
  'tts-1-hd': { perMillionChars: 30 },
  'gpt-4o-mini-tts': {
    perMillionInputTokens: 0.6,
    perMillionAudioTokens: 12,
  },
} as const;

// Rough English tokenizer approximation (cl100k/o200k avg ~4 chars/token).
const CHARS_PER_INPUT_TOKEN = 4;
// OpenAI TTS produces ~25 audio tokens/sec at ~14 spoken chars/sec → ~1.8 tokens/char.
const AUDIO_TOKENS_PER_CHAR = 1.8;

export function estimateCost(model: ModelType, characters: number): CostEstimate {
  if (model === 'gpt-4o-mini-tts') {
    const inputTokens = Math.ceil(characters / CHARS_PER_INPUT_TOKEN);
    const audioTokens = Math.ceil(characters * AUDIO_TOKENS_PER_CHAR);
    const inputCost = (inputTokens / 1_000_000) * PRICING[model].perMillionInputTokens;
    const audioCost = (audioTokens / 1_000_000) * PRICING[model].perMillionAudioTokens;
    return {
      model,
      characters,
      inputTokens,
      audioTokens,
      estimatedUsdCost: inputCost + audioCost,
      billingBasis: 'tokens',
    };
  }

  const perMillionChars = PRICING[model].perMillionChars;
  return {
    model,
    characters,
    estimatedUsdCost: (characters / 1_000_000) * perMillionChars,
    billingBasis: 'characters',
    pricePerMillionUsd: perMillionChars,
  };
}

export function formatUsd(amount: number): string {
  if (amount <= 0) return '$0.00';
  if (amount < 0.0001) return '<$0.0001';
  if (amount < 1) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
