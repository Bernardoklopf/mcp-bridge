import type { AIAgent } from './types.js';

/**
 * Known AI agent user-agent patterns.
 * Maintained list of crawlers and AI assistants.
 */
export const KNOWN_AGENTS: AIAgent[] = [
  // OpenAI
  { name: 'GPTBot', pattern: /GPTBot/i, org: 'OpenAI' },
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i, org: 'OpenAI' },
  { name: 'OAI-SearchBot', pattern: /OAI-SearchBot/i, org: 'OpenAI' },

  // Anthropic
  { name: 'ClaudeBot', pattern: /ClaudeBot/i, org: 'Anthropic' },
  { name: 'claude-web', pattern: /claude-web/i, org: 'Anthropic' },
  { name: 'anthropic-ai', pattern: /anthropic-ai/i, org: 'Anthropic' },

  // Google
  { name: 'Google-Extended', pattern: /Google-Extended/i, org: 'Google' },

  // Perplexity
  { name: 'PerplexityBot', pattern: /PerplexityBot/i, org: 'Perplexity' },
  { name: 'Perplexity-User', pattern: /Perplexity-User/i, org: 'Perplexity' },

  // Meta
  { name: 'meta-externalagent', pattern: /meta-externalagent/i, org: 'Meta' },

  // Apple
  { name: 'Applebot-Extended', pattern: /Applebot-Extended/i, org: 'Apple' },

  // Amazon
  { name: 'Amazonbot', pattern: /Amazonbot/i, org: 'Amazon' },

  // ByteDance
  { name: 'Bytespider', pattern: /Bytespider/i, org: 'ByteDance' },

  // Microsoft
  { name: 'BingBot', pattern: /bingbot/i, org: 'Microsoft' },
];
