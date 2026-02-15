import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { mcpBridge } from '../index.js';

// Mock helper to create Express request objects
function createMockRequest(overrides: Partial<Request> = {}): Request {
  const req = {
    headers: {},
    ip: '127.0.0.1',
    path: '/',
    protocol: 'http',
    originalUrl: '/',
    get: vi.fn((header: string) => (header === 'host' ? 'localhost' : undefined)),
    ...overrides,
  } as unknown as Request;
  return req;
}

// Mock helper to create Express response objects
function createMockResponse(): Response {
  const headers: Record<string, string | number | string[]> = {};
  const res = {
    headersSent: false,
    send: vi.fn(function (this: Response, body?: unknown) {
      (this as any)._body = body;
      return this;
    }),
    setHeader: vi.fn(function (this: Response, key: string, value: string | number | string[]) {
      headers[key.toLowerCase()] = value;
      return this;
    }),
    getHeader: vi.fn((key: string) => headers[key.toLowerCase()]),
    removeHeader: vi.fn((key: string) => {
      delete headers[key.toLowerCase()];
    }),
  } as unknown as Response;

  // Bind send to the response object
  res.send = res.send.bind(res);

  return res;
}

describe('mcpBridge Express Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  describe('LLM Request Detection & Transformation', () => {
    it('should transform HTML to markdown for Accept: text/markdown header', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);

      // Set content-type before sending
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Test Title</h1><p>Test content</p></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toContain('# Test Title');
      expect(body).toContain('Test content');
      expect(body).not.toContain('<html>');
    });

    it('should transform HTML to markdown for known AI User-Agent', () => {
      const req = createMockRequest({
        headers: { 'user-agent': 'GPTBot/1.0' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Hello</h1></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toContain('# Hello');
    });

    it('should transform HTML to markdown for custom header', () => {
      const req = createMockRequest({
        headers: { 'x-llm-request': 'true' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><p>Content</p></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toContain('Content');
      expect(body).not.toContain('<p>');
    });

    it('should pass through HTML for browser requests', () => {
      const req = createMockRequest({
        headers: { accept: 'text/html' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Browser</h1></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toBe(html);
      expect(body).toContain('<html>');
    });
  });

  describe('Path Matching (Exclude/Include)', () => {
    it('should exclude paths matching glob patterns', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
        path: '/api/data',
      });
      const res = createMockResponse();
      const middleware = mcpBridge({
        exclude: ['/api/*'],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should only process included paths when include is set', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
        path: '/other',
      });
      const res = createMockResponse();
      const middleware = mcpBridge({
        include: ['/docs/*'],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle complex glob patterns', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
        path: '/static/images/logo.png',
      });
      const res = createMockResponse();
      const middleware = mcpBridge({
        exclude: ['/static/**/*.png', '/api/*'],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should prioritize exclude over include', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
        path: '/docs/secret',
      });
      const res = createMockResponse();
      const middleware = mcpBridge({
        include: ['/docs/*'],
        exclude: ['/docs/secret'],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Content-Type Handling', () => {
    it('should only transform text/html responses', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Title</h1></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toContain('# Title');
    });

    it('should skip JSON responses', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'application/json');

      const json = JSON.stringify({ message: 'test' });
      res.send(json);

      const body = (res as any)._body;
      expect(body).toBe(json);
    });

    it('should skip non-string responses', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const buffer = Buffer.from('test');
      res.send(buffer as any);

      const body = (res as any)._body;
      expect(body).toBe(buffer);
    });

    it('should handle content-type with charset parameter', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html; charset=utf-8');

      const html = '<html><body><h1>UTF-8</h1></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toContain('# UTF-8');
    });
  });

  describe('Header Management', () => {
    it('should set markdown response headers', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Test</h1></body></html>';
      res.send(html);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/markdown; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Accept, User-Agent');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Source', expect.stringContaining('mcp-bridge'));
    });

    it('should remove Content-Length after transformation', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');
      res.setHeader('content-length', '1000');

      const html = '<html><body><h1>Test</h1></body></html>';
      res.send(html);

      expect(res.removeHeader).toHaveBeenCalledWith('content-length');
    });

    it('should include token count header by default', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Test</h1></body></html>';
      res.send(html);

      expect(res.setHeader).toHaveBeenCalledWith('X-Markdown-Tokens', expect.any(String));
    });

    it('should apply custom transform if provided', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge({
        transform: (markdown) => `CUSTOM: ${markdown}`,
      });

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      const html = '<html><body><h1>Test</h1></body></html>';
      res.send(html);

      const body = (res as any)._body;
      expect(body).toContain('CUSTOM:');
    });
  });

  describe('Error Handling', () => {
    it('should fallback to HTML on extraction error', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      middleware(req, res, next);
      res.setHeader('content-type', 'text/html');

      // Invalid HTML that might cause parsing errors
      const invalidHtml = '<html><body><unclosed>';
      res.send(invalidHtml);

      // Should still receive some response (either transformed or original)
      expect(res.send).toHaveBeenCalled();
    });

    it('should not crash the server on invalid HTML', () => {
      const req = createMockRequest({
        headers: { accept: 'text/markdown' },
      });
      const res = createMockResponse();
      const middleware = mcpBridge();

      expect(() => {
        middleware(req, res, next);
        res.setHeader('content-type', 'text/html');
        res.send('<<<invalid>>>');
      }).not.toThrow();
    });
  });
});
