import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMcpBridgeMiddleware } from '../index.js';

// Mock Next.js Request
function createMockNextRequest(overrides: Partial<any> = {}): any {
  const headersMap = new Map<string, string>();

  const mockHeaders: any = {
    get: (name: string) => headersMap.get(name.toLowerCase()),
    has: (name: string) => headersMap.has(name.toLowerCase()),
    set: (name: string, value: string) => headersMap.set(name.toLowerCase(), value),
    delete: (name: string) => headersMap.delete(name.toLowerCase()),
    forEach: (callback: (value: string, key: string) => void) => {
      headersMap.forEach((value, key) => callback(value, key));
    },
  };

  // Set default headers if provided
  if (overrides.headers) {
    Object.entries(overrides.headers).forEach(([key, value]) => {
      headersMap.set(key.toLowerCase(), value as string);
    });
  }

  return {
    headers: mockHeaders,
    ip: '127.0.0.1',
    nextUrl: { pathname: '/' },
    url: 'http://localhost:3000/',
    ...overrides,
    headers: mockHeaders,
  };
}

// Mock global fetch
const originalFetch = global.fetch;

describe('createMcpBridgeMiddleware', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('LLM Request Detection & Transformation', () => {
    it('should transform HTML to markdown for Accept: text/markdown', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        url: 'http://localhost:3000/page',
      });

      // Mock fetch to return HTML
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test Title</h1><p>Content</p></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeDefined();
      const text = await (response as any).text();
      expect(text).toContain('# Test Title');
      expect(text).toContain('Content');
      expect(text).not.toContain('<html>');
    });

    it('should transform HTML to markdown for AI User-Agent', async () => {
      const request = createMockNextRequest({
        headers: { 'user-agent': 'ClaudeBot/1.0' },
        url: 'http://localhost:3000/page',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Hello</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeDefined();
      const text = await (response as any).text();
      expect(text).toContain('# Hello');
    });

    it('should return undefined (pass-through) for browser requests', async () => {
      const request = createMockNextRequest({
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should preserve query parameters in transformed responses', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        url: 'http://localhost:3000/page?param=value',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Page</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/page?param=value',
        expect.any(Object)
      );
    });
  });

  describe('Path Matching (Exclude/Include)', () => {
    it('should exclude paths matching glob patterns', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        nextUrl: { pathname: '/api/data' },
      });

      const middleware = createMcpBridgeMiddleware({
        exclude: ['/api/*'],
      });
      const response = await middleware(request);

      expect(response).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle Next.js specific paths (_next/static)', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        nextUrl: { pathname: '/_next/static/chunk.js' },
      });

      const middleware = createMcpBridgeMiddleware({
        exclude: ['/_next/*'],
      });
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });

    it('should support complex glob patterns', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        nextUrl: { pathname: '/static/images/logo.png' },
      });

      const middleware = createMcpBridgeMiddleware({
        exclude: ['/static/*'],
      });
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });

    it('should only process included paths when include is set', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        nextUrl: { pathname: '/other' },
      });

      const middleware = createMcpBridgeMiddleware({
        include: ['/docs/*'],
      });
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });
  });

  describe('Fetch Bypass Mechanism', () => {
    it('should add bypass header to prevent transformation loop', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        url: 'http://localhost:3000/page',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      await middleware(request);

      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.get('x-mcp-bridge-bypass')).toBe('1');
    });

    it('should fetch content from same origin', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        url: 'http://localhost:3000/test-page',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      await middleware(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/test-page',
        expect.objectContaining({
          redirect: 'follow',
        })
      );
    });

    it('should override Accept header to request HTML', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
        url: 'http://localhost:3000/page',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body>Test</body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      await middleware(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.get('accept')).toBe('text/html');
    });
  });

  describe('Response Headers & Status', () => {
    it('should set markdown Content-Type', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect((response as any).headers['Content-Type']).toContain('text/markdown');
    });

    it('should set Vary header correctly', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect((response as any).headers['Vary']).toBe('Accept, User-Agent');
    });

    it('should return status 200 for transformed responses', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect((response as any).status).toBe(200);
    });

    it('should apply custom transform if provided', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware({
        transform: (markdown) => `CUSTOM: ${markdown}`,
      });
      const response = await middleware(request);

      const text = await (response as any).text();
      expect(text).toContain('CUSTOM:');
    });
  });

  describe('Content-Type Filtering', () => {
    it('should return undefined for non-HTML responses', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => '{"message": "test"}',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });

    it('should handle content-type with charset', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html; charset=utf-8']]),
        text: async () => '<html><body><h1>UTF-8</h1></body></html>',
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeDefined();
      const text = await (response as any).text();
      expect(text).toContain('# UTF-8');
    });
  });

  describe('Error Handling', () => {
    it('should return undefined on fetch failure', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });

    it('should return undefined on extraction error', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => { throw new Error('Parse error'); },
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });

    it('should handle network timeouts gracefully', async () => {
      const request = createMockNextRequest({
        headers: { accept: 'text/markdown' },
      });

      (global.fetch as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 0);
        });
      });

      const middleware = createMcpBridgeMiddleware();
      const response = await middleware(request);

      expect(response).toBeUndefined();
    });
  });
});
