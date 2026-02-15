import { describe, it, expect } from 'vitest';
import { buildResponseHeaders } from '../headers.js';

describe('buildResponseHeaders', () => {
  it('sets required headers', () => {
    const headers = buildResponseHeaders('# Hello', 'text/html; charset=utf-8');
    expect(headers['Content-Type']).toBe('text/markdown; charset=utf-8');
    expect(headers['Vary']).toBe('Accept, User-Agent');
    expect(headers['X-Content-Source']).toMatch(/^mcp-bridge\//);
    expect(headers['X-Original-Content-Type']).toBe('text/html; charset=utf-8');
  });

  it('includes token count by default', () => {
    const headers = buildResponseHeaders('Hello world', 'text/html');
    expect(headers['X-Markdown-Tokens']).toBeDefined();
    expect(Number(headers['X-Markdown-Tokens'])).toBeGreaterThan(0);
  });

  it('can disable token count', () => {
    const headers = buildResponseHeaders('Hello', 'text/html', {
      tokenCount: false,
    });
    expect(headers['X-Markdown-Tokens']).toBeUndefined();
  });

  it('sets Content-Usage header with all preferences', () => {
    const headers = buildResponseHeaders('Hello', 'text/html', {
      contentUsage: {
        aiInput: 'y',
        trainAi: 'n',
        search: 'y',
      },
    });
    expect(headers['Content-Usage']).toBe('ai-input=y, train-ai=n, search=y');
  });

  it('sets Content-Usage with partial preferences', () => {
    const headers = buildResponseHeaders('Hello', 'text/html', {
      contentUsage: { aiInput: 'y' },
    });
    expect(headers['Content-Usage']).toBe('ai-input=y');
  });

  it('omits Content-Usage when not configured', () => {
    const headers = buildResponseHeaders('Hello', 'text/html');
    expect(headers['Content-Usage']).toBeUndefined();
  });
});
