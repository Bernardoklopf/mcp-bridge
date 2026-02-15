import type { DetectConfig, DetectionResult, IncomingRequest } from './types.js';
import { KNOWN_AGENTS } from './agents.js';

/**
 * Known AI provider IP ranges in CIDR notation.
 * IPv4 only for now. These ranges are used as a fallback detection method
 * with medium confidence since IP-based detection is less reliable than headers.
 *
 * Last updated: 2026-02-14
 */
const KNOWN_AI_IP_RANGES = [
  // OpenAI (from https://platform.openai.com/docs/plugins/bot)
  { cidr: '20.15.240.64/28', provider: 'OpenAI' },
  { cidr: '40.84.180.224/28', provider: 'OpenAI' },

  // Anthropic (Claude crawlers - AWS US-West-2)
  { cidr: '160.79.104.0/23', provider: 'Anthropic' },
  { cidr: '54.186.0.0/16', provider: 'Anthropic' },

  // Google (Bard/Gemini crawlers)
  { cidr: '66.249.64.0/19', provider: 'Google' },

  // Perplexity
  { cidr: '44.195.0.0/16', provider: 'Perplexity' },
];

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
 * Convert an IPv4 address string to a 32-bit unsigned integer.
 */
function ipToNumber(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check if an IP address is within a CIDR range.
 * Only supports IPv4 for now.
 */
function isIpInRange(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Determines if an incoming request is from an LLM.
 *
 * Detection priority chain:
 * 1. Accept header contains "text/markdown"
 * 2. Known AI User-Agent string match
 * 3. Custom header "X-LLM-Request: true"
 * 4. IP address in known AI provider range
 * 5. Custom detection function
 * 6. No match → NOT_LLM
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

  // 4. IP range check
  if (config.ipRanges !== false && request.ip) {
    for (const { cidr, provider } of KNOWN_AI_IP_RANGES) {
      if (isIpInRange(request.ip, cidr)) {
        return {
          isLLM: true,
          confidence: 'medium',
          method: 'ip-range',
          agent: provider,
        };
      }
    }
  }

  // 5. Custom detection function
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
