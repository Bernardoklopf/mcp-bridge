import type { ContentUsagePreferences, HeadersConfig, ResponseHeaders } from './types.js';
import { estimateTokens } from './tokens.js';

const VERSION = '0.1.0';

/**
 * Builds the Content-Usage header value from preferences.
 * Follows IETF AIPREF draft format.
 */
function buildContentUsage(prefs: ContentUsagePreferences): string {
  const parts: string[] = [];
  if (prefs.aiInput !== undefined) parts.push(`ai-input=${prefs.aiInput}`);
  if (prefs.trainAi !== undefined) parts.push(`train-ai=${prefs.trainAi}`);
  if (prefs.search !== undefined) parts.push(`search=${prefs.search}`);
  return parts.join(', ');
}

/**
 * Builds response headers for the markdown response.
 */
export function buildResponseHeaders(
  markdown: string,
  originalContentType: string,
  config: HeadersConfig = {},
): ResponseHeaders {
  const { contentUsage, tokenCount = true } = config;

  const headers: ResponseHeaders = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Vary': 'Accept, User-Agent',
    'X-Content-Source': `mcp-bridge/${VERSION}`,
    'X-Original-Content-Type': originalContentType,
  };

  if (contentUsage) {
    const value = buildContentUsage(contentUsage);
    if (value) headers['Content-Usage'] = value;
  }

  if (tokenCount) {
    headers['X-Markdown-Tokens'] = String(estimateTokens(markdown));
  }

  return headers;
}
