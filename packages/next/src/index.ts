import {
  detectLLM,
  extractContent,
  convertToMarkdown,
  buildResponseHeaders,
  type McpBridgeConfig,
  type IncomingRequest,
} from '@mcp-bridge/core';

export type { McpBridgeConfig } from '@mcp-bridge/core';

/**
 * Next.js middleware function type.
 * Declared here to avoid a hard dependency on the 'next' package at compile time.
 */
interface NextRequest {
  headers: Headers;
  ip?: string;
  nextUrl: { pathname: string };
  url: string;
}

interface NextResponse {
  headers: Headers;
  status: number;
  text(): Promise<string>;
}

type NextMiddleware = (request: NextRequest) => Promise<NextResponse | undefined> | NextResponse | undefined;

interface NextModule {
  NextResponse: {
    next(): NextResponse;
    rewrite(url: string | URL): NextResponse;
  };
}

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function shouldProcess(
  path: string,
  config: McpBridgeConfig,
): boolean {
  if (config.include) {
    for (const pattern of config.include) {
      if (path.match(globToRegex(pattern))) return true;
    }
    return false;
  }
  if (config.exclude) {
    for (const pattern of config.exclude) {
      if (path.match(globToRegex(pattern))) return false;
    }
  }
  return true;
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/**
 * Creates a Next.js middleware that transforms HTML responses to markdown for LLM clients.
 *
 * This middleware intercepts requests, detects LLM clients, fetches the page,
 * and returns clean markdown instead of HTML.
 *
 * Usage in middleware.ts:
 * ```ts
 * import { createMcpBridgeMiddleware } from '@mcp-bridge/next';
 * export const middleware = createMcpBridgeMiddleware({ ... });
 * export const config = { matcher: ['/((?!api|_next|favicon.ico).*)'] };
 * ```
 */
export function createMcpBridgeMiddleware(
  config: McpBridgeConfig = {},
): NextMiddleware {
  return async (request: NextRequest) => {
    const path = request.nextUrl.pathname;

    if (!shouldProcess(path, config)) {
      return undefined;
    }

    const incoming: IncomingRequest = {
      headers: headersToRecord(request.headers),
      ip: request.ip,
    };

    const detection = detectLLM(incoming, config.detect);

    if (!detection.isLLM) {
      return undefined;
    }

    // Fetch the actual page content by making an internal request
    // with a bypass header to prevent infinite loops
    try {
      const internalHeaders = new Headers(request.headers);
      internalHeaders.set('x-mcp-bridge-bypass', '1');
      internalHeaders.delete('accept');
      internalHeaders.set('accept', 'text/html');

      const response = await fetch(request.url, {
        headers: internalHeaders,
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        return undefined;
      }

      const html = await response.text();
      const originalContentType = contentType;

      // Extract and convert
      const { content, metadata } = extractContent(
        html,
        config.extract,
        request.url,
      );

      let markdown = convertToMarkdown(content, metadata);

      if (config.transform) {
        markdown = config.transform(markdown, metadata);
      }

      const responseHeaders = buildResponseHeaders(
        markdown,
        originalContentType,
        config.headers,
      );

      return new Response(markdown, {
        status: 200,
        headers: responseHeaders as unknown as Record<string, string>,
      }) as unknown as NextResponse;
    } catch {
      // On error, let the request pass through
      return undefined;
    }
  };
}
