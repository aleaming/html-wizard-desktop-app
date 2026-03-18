import { AIProviderType, CostEstimate } from '../types';

/**
 * Rough token estimation: ~4 characters per token.
 * This is an approximation; actual tokenizers vary by provider.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Per-provider pricing (USD per 1M tokens) as of early 2026.
 * Update these values when pricing changes.
 */
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  claude: {
    inputPer1M: 3.00,   // claude-sonnet-4
    outputPer1M: 15.00,
  },
  gemini: {
    inputPer1M: 1.25,   // gemini-2.5-pro ≤200k context
    outputPer1M: 10.00,
  },
  openai: {
    inputPer1M: 2.50,   // gpt-4o
    outputPer1M: 10.00,
  },
};

function providerKey(provider: AIProviderType): string {
  if (typeof provider === 'string') return provider;
  return 'plugin';
}

/**
 * Estimate the cost of a request given token counts.
 */
export function estimateCost(
  provider: AIProviderType,
  inputTokens: number,
  outputTokens: number
): CostEstimate {
  const key = providerKey(provider);
  const pricing = PRICING[key] ?? { inputPer1M: 0, outputPer1M: 0 };

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCost = inputCost + outputCost;

  return {
    provider,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000, // 6 decimal places
  };
}

/**
 * Format a cost value for display.
 * Values under $0.01 are shown in fractional cents.
 */
export function formatCost(costUsd: number): string {
  if (costUsd === 0) return '$0.00';
  if (costUsd < 0.0001) return `$${(costUsd * 100).toFixed(4)}¢`;
  if (costUsd < 0.01) return `$${costUsd.toFixed(5)}`;
  if (costUsd < 1) return `$${costUsd.toFixed(4)}`;
  return `$${costUsd.toFixed(2)}`;
}

/**
 * Format a token count for display.
 * Counts over 1000 are shown with K suffix.
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 10_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}

/**
 * Get the pricing info for a provider (for display in UI).
 */
export function getProviderPricing(provider: AIProviderType): {
  inputPer1M: number;
  outputPer1M: number;
} {
  const key = providerKey(provider);
  return PRICING[key] ?? { inputPer1M: 0, outputPer1M: 0 };
}
