import type { DetectConfig, DetectionResult, IncomingRequest } from './types.js';
import { KNOWN_AGENTS } from './agents.js';

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  if (!key) return undefined;
  const val = headers[key];
  return Array.isArray(val) ? val[0] : val;
}

/**
 * Determines if an incoming request is from an LLM.
 *
 * Detection priority chain:
 * 1. Accept header contains "text/markdown"
 * 2. Known AI User-Agent string match
 * 3. Custom header "X-LLM-Request: true"
 * 4. Custom detection function
 * 5. No match → NOT_LLM
 */
export function detectLLM(
  request: IncomingRequest,
  config: DetectConfig = {},
): DetectionResult {
  const {
    acceptHeader = true,
    userAgent = true,
    customHeader = 'X-LLM-Request',
  } = config;

  // 1. Accept header check
  if (acceptHeader) {
    const accept = getHeader(request.headers, 'accept');
    if (accept && accept.includes('text/markdown')) {
      return {
        isLLM: true,
        confidence: 'high',
        method: 'accept-header',
      };
    }
  }

  // 2. User-Agent check
  if (userAgent) {
    const ua = getHeader(request.headers, 'user-agent');
    if (ua) {
      for (const agent of KNOWN_AGENTS) {
        if (agent.pattern.test(ua)) {
          return {
            isLLM: true,
            confidence: 'high',
            method: 'user-agent',
            agent: agent.name,
          };
        }
      }
    }
  }

  // 3. Custom header check
  if (customHeader) {
    const headerVal = getHeader(request.headers, customHeader);
    if (headerVal === 'true' || headerVal === '1') {
      return {
        isLLM: true,
        confidence: 'high',
        method: 'custom-header',
      };
    }
  }

  // 4. Custom detection function
  if (config.custom) {
    if (config.custom(request)) {
      return {
        isLLM: true,
        confidence: 'medium',
        method: 'custom',
      };
    }
  }

  return {
    isLLM: false,
    confidence: 'low',
    method: 'none',
  };
}
