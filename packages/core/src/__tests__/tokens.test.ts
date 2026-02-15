import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../tokens.js';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens based on ~4 chars per token', () => {
    const text = 'Hello world'; // 11 chars → ceil(11/4) = 3
    expect(estimateTokens(text)).toBe(3);
  });

  it('handles longer text', () => {
    const text = 'a'.repeat(100); // 100 chars → 25 tokens
    expect(estimateTokens(text)).toBe(25);
  });

  it('rounds up partial tokens', () => {
    const text = 'abcde'; // 5 chars → ceil(5/4) = 2
    expect(estimateTokens(text)).toBe(2);
  });

  it('handles single character', () => {
    expect(estimateTokens('a')).toBe(1);
  });
});
