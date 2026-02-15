/**
 * Estimates the number of tokens in a text string.
 *
 * Uses a simple heuristic: ~4 characters per token, which is a reasonable
 * approximation for English text with GPT/Claude tokenizers.
 *
 * For more accurate counts, consider using a dedicated tokenizer library.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
