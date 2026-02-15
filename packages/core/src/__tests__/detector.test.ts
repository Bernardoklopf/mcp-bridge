import { describe, it, expect } from 'vitest';
import { detectLLM } from '../detector.js';

describe('detectLLM', () => {
  describe('Accept header detection', () => {
    it('detects text/markdown in Accept header', () => {
      const result = detectLLM({
        headers: { accept: 'text/markdown' },
      });
      expect(result.isLLM).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.method).toBe('accept-header');
    });

    it('detects text/markdown among multiple types', () => {
      const result = detectLLM({
        headers: { accept: 'text/html, text/markdown, application/json' },
      });
      expect(result.isLLM).toBe(true);
      expect(result.method).toBe('accept-header');
    });

    it('does not trigger on normal Accept headers', () => {
      const result = detectLLM({
        headers: { accept: 'text/html, application/json' },
      });
      expect(result.isLLM).toBe(false);
    });

    it('can be disabled', () => {
      const result = detectLLM(
        { headers: { accept: 'text/markdown' } },
        { acceptHeader: false },
      );
      expect(result.isLLM).toBe(false);
    });
  });

  describe('User-Agent detection', () => {
    const agents = [
      ['GPTBot/1.0', 'GPTBot'],
      ['ChatGPT-User/1.0', 'ChatGPT-User'],
      ['ClaudeBot/1.0', 'ClaudeBot'],
      ['claude-web/1.0', 'claude-web'],
      ['anthropic-ai/1.0', 'anthropic-ai'],
      ['Google-Extended/1.0', 'Google-Extended'],
      ['PerplexityBot/1.0', 'PerplexityBot'],
      ['meta-externalagent/1.0', 'meta-externalagent'],
      ['Applebot-Extended/1.0', 'Applebot-Extended'],
      ['Amazonbot/1.0', 'Amazonbot'],
      ['Bytespider/1.0', 'Bytespider'],
      ['Mozilla/5.0 (compatible; bingbot/2.0)', 'BingBot'],
    ];

    it.each(agents)('detects %s as LLM agent %s', (ua, expectedAgent) => {
      const result = detectLLM({
        headers: { 'user-agent': ua },
      });
      expect(result.isLLM).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.method).toBe('user-agent');
      expect(result.agent).toBe(expectedAgent);
    });

    it('does not trigger on regular browser User-Agent', () => {
      const result = detectLLM({
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      expect(result.isLLM).toBe(false);
    });

    it('can be disabled', () => {
      const result = detectLLM(
        { headers: { 'user-agent': 'ClaudeBot/1.0' } },
        { userAgent: false },
      );
      expect(result.isLLM).toBe(false);
    });
  });

  describe('Custom header detection', () => {
    it('detects X-LLM-Request: true', () => {
      const result = detectLLM({
        headers: { 'x-llm-request': 'true' },
      });
      expect(result.isLLM).toBe(true);
      expect(result.method).toBe('custom-header');
    });

    it('detects X-LLM-Request: 1', () => {
      const result = detectLLM({
        headers: { 'x-llm-request': '1' },
      });
      expect(result.isLLM).toBe(true);
    });

    it('supports custom header name', () => {
      const result = detectLLM(
        { headers: { 'x-ai-client': 'true' } },
        { customHeader: 'X-AI-Client' },
      );
      expect(result.isLLM).toBe(true);
      expect(result.method).toBe('custom-header');
    });
  });

  describe('IP range detection', () => {
    it('detects OpenAI IP range', () => {
      const result = detectLLM({
        headers: {},
        ip: '20.15.240.65',
      });
      expect(result.isLLM).toBe(true);
      expect(result.method).toBe('ip-range');
      expect(result.confidence).toBe('medium');
      expect(result.agent).toBe('OpenAI');
    });

    it('detects Anthropic IP range', () => {
      const result = detectLLM({
        headers: {},
        ip: '160.79.104.50',
      });
      expect(result.isLLM).toBe(true);
      expect(result.method).toBe('ip-range');
      expect(result.agent).toBe('Anthropic');
    });

    it('detects Google IP range', () => {
      const result = detectLLM({
        headers: {},
        ip: '66.249.64.100',
      });
      expect(result.isLLM).toBe(true);
      expect(result.agent).toBe('Google');
    });

    it('does not detect non-AI IP', () => {
      const result = detectLLM({
        headers: {},
        ip: '192.168.1.1',
      });
      expect(result.isLLM).toBe(false);
    });

    it('can be disabled via config', () => {
      const result = detectLLM(
        {
          headers: {},
          ip: '20.15.240.65',
        },
        { ipRanges: false },
      );
      expect(result.isLLM).toBe(false);
    });

    it('handles missing IP gracefully', () => {
      const result = detectLLM({ headers: {} });
      expect(result.isLLM).toBe(false);
    });

    it('respects priority chain (Accept header over IP)', () => {
      const result = detectLLM({
        headers: { accept: 'text/markdown' },
        ip: '20.15.240.65',
      });
      expect(result.method).toBe('accept-header');
    });

    it('respects priority chain (User-Agent over IP)', () => {
      const result = detectLLM({
        headers: { 'user-agent': 'GPTBot/1.0' },
        ip: '20.15.240.65',
      });
      expect(result.method).toBe('user-agent');
    });

    it('IP range takes priority over custom function', () => {
      const result = detectLLM(
        {
          headers: {},
          ip: '20.15.240.65',
        },
        { custom: () => true },
      );
      expect(result.method).toBe('ip-range');
    });
  });

  describe('Custom detection function', () => {
    it('uses custom function when provided', () => {
      const result = detectLLM(
        { headers: {}, ip: '10.0.0.1' },
        { custom: (req) => req.ip === '10.0.0.1' },
      );
      expect(result.isLLM).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.method).toBe('custom');
    });
  });

  describe('Priority chain', () => {
    it('Accept header takes priority over User-Agent', () => {
      const result = detectLLM({
        headers: {
          accept: 'text/markdown',
          'user-agent': 'ClaudeBot/1.0',
        },
      });
      expect(result.method).toBe('accept-header');
    });

    it('User-Agent takes priority over custom header', () => {
      const result = detectLLM({
        headers: {
          'user-agent': 'GPTBot/1.0',
          'x-llm-request': 'true',
        },
      });
      expect(result.method).toBe('user-agent');
    });
  });

  describe('No match', () => {
    it('returns not LLM for empty headers', () => {
      const result = detectLLM({ headers: {} });
      expect(result.isLLM).toBe(false);
      expect(result.method).toBe('none');
    });
  });
});
