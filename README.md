# mcp-bridge

**Self-hosted middleware that serves clean markdown to LLMs, beautiful HTML to browsers.**

When a human visits your site, they see your full UI. When an LLM visits, it receives token-optimized markdown — automatically.

---

## The Problem

Websites serve bloated HTML — navigation bars, scripts, stylesheets, ads, cookie banners, tracking pixels. A typical webpage is 50-100KB of HTML, but only 5-10KB is actual content. When an LLM consumes this via tool use or web fetching, **70-80% of tokens are wasted** on irrelevant markup.

```
┌─────────────────────────────────────────┐
│  nav  nav  nav  nav  nav  nav  nav  nav │  ← wasted tokens
├─────────────────────────────────────────┤
│  sidebar │                    │ ad      │  ← wasted tokens
│          │  ACTUAL CONTENT    │         │
│          │  (this is all the  │         │
│          │   LLM needs)       │         │
│          │                    │ ad      │  ← wasted tokens
├──────────┴────────────────────┴─────────┤
│  footer  footer  footer  footer  footer │  ← wasted tokens
│  <script src="analytics.js">            │  ← wasted tokens
│  <script src="tracking.js">             │  ← wasted tokens
└─────────────────────────────────────────┘
```

Cloudflare launched "Markdown for Agents" (Feb 2026) to solve this at the CDN edge — but only for Cloudflare paid customers.

**mcp-bridge** gives the same capability to **any** web server, self-hosted, with a single line of middleware.

## The Solution

mcp-bridge detects LLM requests and automatically transforms HTML responses into clean, structured markdown.

**Before** (raw HTML, ~12KB, ~3,000 tokens):
```html
<!DOCTYPE html>
<html>
<head>
  <style>/* 200 lines of CSS */</style>
  <script src="analytics.js"></script>
</head>
<body>
  <nav><!-- 50 links --></nav>
  <div class="hero"><!-- animations --></div>
  <main>
    <h1>Pricing</h1>
    <p>Simple pricing for everyone.</p>
    <!-- actual content... -->
  </main>
  <footer><!-- legal links --></footer>
  <div class="cookie-banner"><!-- consent UI --></div>
  <script src="tracking.js"></script>
</body>
</html>
```

**After** (clean markdown, ~900B, ~230 tokens — **92% reduction**):
```markdown
---
title: "Pricing - Acme Corp"
url: https://acme.com/pricing
description: "Simple, transparent pricing for teams of all sizes."
---

# Pricing

Simple, transparent pricing for teams of all sizes.

### Free — $0
- 1,000 API calls/month
- Community support

### Pro — $29/month
- 100,000 API calls/month
- Priority support
- Unlimited team members
```

## How It Works

```
                    ┌─────────────────┐
                    │   Your Server   │
                    │  (Express/Next) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
  Request ─────────►   mcp-bridge    │
                    │   middleware    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Detect:      │
                    │  Is this an LLM?│
                    └───┬─────────┬───┘
                        │         │
                   YES  │         │  NO
                        ▼         ▼
               ┌──────────┐  ┌──────────┐
               │ Extract   │  │ Pass     │
               │ content   │  │ through  │
               │ Convert   │  │ HTML     │
               │ to MD     │  │ as-is    │
               └──────────┘  └──────────┘
```

Detection uses a priority chain:
1. `Accept: text/markdown` header (ecosystem standard)
2. Known AI User-Agent match (GPTBot, ClaudeBot, etc.)
3. Custom `X-LLM-Request: true` header
4. Custom detection function

## Quick Start

### Express

```bash
npm install @mcp-bridge/express
```

```typescript
import express from 'express';
import { mcpBridge } from '@mcp-bridge/express';

const app = express();

app.use(mcpBridge({
  exclude: ['/api/*', '/health'],
}));

// Your routes serve HTML as normal
app.get('/', (req, res) => {
  res.send('<html>...</html>');
});

app.listen(3000);
```

That's it. Browser requests get HTML, LLM requests get markdown.

### Next.js

```bash
npm install @mcp-bridge/next
```

```typescript
// middleware.ts
import { createMcpBridgeMiddleware } from '@mcp-bridge/next';

export const middleware = createMcpBridgeMiddleware({
  exclude: ['/api/*'],
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Detection Methods

mcp-bridge uses a priority chain to identify LLM requests:

| Priority | Method | Signal | Confidence |
|----------|--------|--------|------------|
| 1 | Accept header | `Accept: text/markdown` | High |
| 2 | User-Agent | Known AI bot patterns | High |
| 3 | Custom header | `X-LLM-Request: true` | High |
| 4 | IP ranges | Known AI provider IP ranges | Medium |
| 5 | Custom function | Your logic | Medium |

The `Accept: text/markdown` header is the emerging ecosystem standard, used by Claude Code, OpenCode, and backed by Cloudflare's implementation.

## Configuration

```typescript
interface McpBridgeConfig {
  detect?: {
    acceptHeader?: boolean;       // Check Accept: text/markdown (default: true)
    userAgent?: boolean;          // Check known AI user-agents (default: true)
    customHeader?: string;        // Custom header name (default: 'X-LLM-Request')
    ipRanges?: boolean;           // Check known AI IP ranges (default: true)
    custom?: (req) => boolean;    // Custom detection function
  };

  extract?: {
    annotations?: boolean;        // Respect data-llm-* attributes (default: true)
    fallback?: 'readability' | 'body'; // Extraction strategy (default: 'readability')
    maxLength?: number;           // Max output length in chars (default: 100000)
  };

  headers?: {
    contentUsage?: {              // IETF AIPREF Content-Usage header
      aiInput?: 'y' | 'n';       // Allow AI to use content as input
      trainAi?: 'y' | 'n';       // Allow content for AI training
      search?: 'y' | 'n';        // Allow content in search results
    };
    tokenCount?: boolean;         // Include X-Markdown-Tokens (default: true)
  };

  exclude?: string[];             // Glob patterns for paths to skip
  include?: string[];             // Only process these paths (if set)
  transform?: (md, metadata) => string; // Custom post-processing
}
```

## Developer Annotations

Add HTML attributes to guide extraction for optimal results:

```html
<!-- Mark the main content area -->
<main data-llm-content>
  <h1>Pricing</h1>
  <section>...</section>
</main>

<!-- Exclude elements from LLM output -->
<nav data-llm-ignore>...</nav>
<footer data-llm-ignore>...</footer>
<div class="cookie-banner" data-llm-ignore>...</div>

<!-- Add context hints for LLMs -->
<div data-llm-hint="This table compares pricing tiers">
  <table>...</table>
</div>
```

When `data-llm-content` is present, only content within those elements is extracted. When absent, the middleware uses Mozilla's Readability algorithm (the same one behind Firefox Reader View) to automatically identify the main content.

## Response Headers

mcp-bridge sets these headers on markdown responses:

| Header | Example | Purpose |
|--------|---------|---------|
| `Content-Type` | `text/markdown; charset=utf-8` | Identifies response as markdown |
| `Vary` | `Accept, User-Agent` | Correct caching behavior |
| `X-Content-Source` | `mcp-bridge/0.1.0` | Library identification |
| `X-Original-Content-Type` | `text/html; charset=utf-8` | What the origin served |
| `Content-Usage` | `ai-input=y, train-ai=n` | IETF AIPREF content preferences |
| `X-Markdown-Tokens` | `347` | Estimated token count |

## Standards & Compatibility

mcp-bridge aligns with emerging web standards for AI content delivery:

- **`Accept: text/markdown`** — The ecosystem-converged signal for LLM content requests. Used by Claude Code, OpenCode, and supported by Cloudflare.
- **IETF AIPREF** — `Content-Usage` header for expressing AI content preferences.
- **Readability** — Mozilla's content extraction algorithm, the industry standard for distilling web content.

## Architecture

```
mcp-bridge/
├── packages/
│   ├── core/        # Framework-agnostic engine (detection, extraction, conversion)
│   ├── express/     # Express middleware adapter
│   └── next/        # Next.js middleware adapter
└── examples/
    └── express-app/ # Working demo
```

The `@mcp-bridge/core` package is pure functions with no framework dependencies. It defines the canonical algorithm for:

- **Detection** — Is this request from an LLM?
- **Extraction** — What is the main content of this HTML?
- **Conversion** — Transform clean HTML to markdown
- **Headers** — Build appropriate response headers

This makes it straightforward to port to other languages (Python, Go, Ruby) using equivalent libraries (e.g., `readability-lxml` + `markdownify` in Python).

## Known AI Agents

mcp-bridge recognizes these User-Agent strings:

| Agent | Organization |
|-------|-------------|
| `GPTBot` | OpenAI |
| `ChatGPT-User` | OpenAI |
| `OAI-SearchBot` | OpenAI |
| `ClaudeBot` | Anthropic |
| `claude-web` | Anthropic |
| `anthropic-ai` | Anthropic |
| `Google-Extended` | Google |
| `PerplexityBot` | Perplexity |
| `Perplexity-User` | Perplexity |
| `meta-externalagent` | Meta |
| `Applebot-Extended` | Apple |
| `Amazonbot` | Amazon |
| `Bytespider` | ByteDance |
| `BingBot` | Microsoft |

## Known AI Provider IP Ranges

mcp-bridge can detect LLM requests from known AI provider IP ranges (IPv4 only). This is a fallback detection method with medium confidence, as IP ranges can change and may overlap with legitimate traffic.

| CIDR Range | Provider | Notes |
|------------|----------|-------|
| `20.15.240.64/28` | OpenAI | GPTBot crawler |
| `40.84.180.224/28` | OpenAI | GPTBot crawler |
| `160.79.104.0/23` | Anthropic | Claude crawlers |
| `54.186.0.0/16` | Anthropic | Claude crawlers (AWS US-West-2) |
| `66.249.64.0/19` | Google | Bard/Gemini crawlers |
| `44.195.0.0/16` | Perplexity | Perplexity crawlers |

**Note:** IP-based detection is less reliable than header-based methods and should be used as a fallback. AI providers may change their IP ranges without notice. Last updated: 2026-02-14.

To disable IP range detection:
```typescript
app.use(mcpBridge({
  detect: {
    ipRanges: false,  // Disable IP range detection
  },
}));
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run the example server
cd examples/express-app && pnpm start
```

### Testing the example

```bash
# Browser request → HTML
curl http://localhost:3000/pricing

# LLM request via Accept header → Markdown
curl -H "Accept: text/markdown" http://localhost:3000/pricing

# LLM request via User-Agent → Markdown
curl -H "User-Agent: ClaudeBot/1.0" http://localhost:3000/pricing

# Excluded API path → JSON (unchanged)
curl -H "Accept: text/markdown" http://localhost:3000/api/data
```

## Contributing

Contributions welcome. Key areas:

- **Framework adapters** — Hono, Fastify, Koa, etc.
- **Agent list updates** — New AI crawlers and bots
- **Extraction improvements** — Better content heuristics
- **Language ports** — Python, Go, Ruby implementations of the core algorithm

## Roadmap

- [ ] Python port (`pip install mcp-bridge`)
- [ ] Go port
- [ ] `llms.txt` auto-generation from site content
- [ ] MCP server endpoint for structured tool use
- [ ] Hono / Fastify adapters
- [ ] Streaming support for large pages
- [ ] Cache layer for repeated LLM requests

## License

MIT
