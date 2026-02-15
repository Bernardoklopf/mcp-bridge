import type { Request, Response, NextFunction } from 'express';
import picomatch from 'picomatch';
import {
  detectLLM,
  extractContent,
  convertToMarkdown,
  buildResponseHeaders,
  type McpBridgeConfig,
  type IncomingRequest,
} from '@mcp-bridge/core';

export type { McpBridgeConfig } from '@mcp-bridge/core';

function normalizeHeaders(
  rawHeaders: Request['headers'],
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    result[key] = value;
  }
  return result;
}

function shouldProcess(path: string, config: McpBridgeConfig): boolean {
  if (config.include) {
    const match = picomatch(config.include);
    if (!match(path)) return false;
  }
  if (config.exclude) {
    const match = picomatch(config.exclude);
    if (match(path)) return false;
  }
  return true;
}

function isHtmlResponse(res: Response): boolean {
  const ct = res.getHeader('content-type');
  if (!ct) return false;
  const contentType = Array.isArray(ct) ? ct[0] : String(ct);
  return contentType.includes('text/html');
}

/**
 * Express middleware that transforms HTML responses to markdown for LLM clients.
 *
 * When a browser visits, they get the original HTML.
 * When an LLM visits (detected via Accept header, User-Agent, etc.), they get clean markdown.
 */
export function mcpBridge(config: McpBridgeConfig = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (!shouldProcess(req.path, config)) {
      next();
      return;
    }

    // Detect if this is an LLM request
    const incoming: IncomingRequest = {
      headers: normalizeHeaders(req.headers),
      ip: req.ip,
    };
    const detection = detectLLM(incoming, config.detect);

    if (!detection.isLLM) {
      next();
      return;
    }

    // Intercept res.send to transform HTML responses
    const originalSend = res.send.bind(res);

    res.send = function interceptedSend(body?: unknown): Response {
      // Only transform HTML responses
      if (!isHtmlResponse(res) || typeof body !== 'string') {
        return originalSend(body);
      }

      try {
        const originalContentType = String(
          res.getHeader('content-type') ?? 'text/html',
        );

        // Extract main content
        const { content, metadata } = extractContent(
          body,
          config.extract,
          `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        );

        // Convert to markdown
        let markdown = convertToMarkdown(content, metadata);

        // Apply custom transform if provided
        if (config.transform) {
          markdown = config.transform(markdown, metadata);
        }

        // Build response headers
        const headers = buildResponseHeaders(
          markdown,
          originalContentType,
          config.headers,
        );

        // Remove content-length as body size changed
        res.removeHeader('content-length');

        // Set new headers
        for (const [key, value] of Object.entries(headers)) {
          if (value !== undefined) {
            res.setHeader(key, value);
          }
        }

        return originalSend(markdown);
      } catch {
        // On any error, pass through original response
        return originalSend(body);
      }
    };

    next();
  };
}
