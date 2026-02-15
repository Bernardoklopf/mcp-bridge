# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mcp-bridge** is a self-hosted middleware library that automatically serves clean markdown to LLMs while serving regular HTML to browsers. It detects LLM requests via headers/user-agents, extracts main content using Mozilla's Readability algorithm, converts it to markdown, and returns it with appropriate response headers. Positioned as a self-hosted alternative to Cloudflare's "Markdown for Agents".

## Monorepo Structure

- **`packages/core`** (`@mcp-bridge/core`) — Framework-agnostic engine with all business logic as pure functions. Zero framework dependencies.
- **`packages/express`** (`@mcp-bridge/express`) — Express middleware adapter. Monkey-patches `res.send()` to intercept HTML responses in-process.
- **`packages/next`** (`@mcp-bridge/next`) — Next.js middleware adapter. Uses `fetch()` with a bypass header (`x-mcp-bridge-bypass`) to get HTML, then transforms it.
- **`examples/express-app`** — Working Express demo with annotation examples.

`core` is the dependency of both `express` and `next`. The adapters are thin wrappers that translate framework-specific request/response objects into `core`'s `IncomingRequest` interface.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (turbo, respects dependency order)
pnpm test             # Run all tests (turbo, builds first)
pnpm clean            # Remove dist/ from all packages

# Single package
pnpm --filter @mcp-bridge/core test
pnpm --filter @mcp-bridge/core build

# Run example app
cd examples/express-app && pnpm dev   # uses node --watch
```

## Build & Tooling

- **Package manager**: pnpm (workspaces defined in `pnpm-workspace.yaml`)
- **Monorepo orchestration**: Turborepo (`turbo.json` — build depends on `^build`, test depends on build)
- **Bundler**: tsup (ESM + CJS dual output with `.d.ts` declarations)
- **Test framework**: Vitest (tests only exist in `packages/core/src/__tests__/`)
- **TypeScript**: strict mode, target ES2022, bundler module resolution

## Architecture: Processing Pipeline

The core pipeline is four independent, testable modules:

1. **Detect** (`detector.ts`) — Priority chain: `Accept: text/markdown` → known AI User-Agent patterns → custom header (`X-LLM-Request`) → custom detection function → not LLM
2. **Extract** (`extractor.ts`) — Parses HTML with `linkedom`, checks for `data-llm-content`/`data-llm-ignore`/`data-llm-hint` annotations, falls back to Mozilla Readability, final fallback to raw `<body>`
3. **Convert** (`converter.ts`) — Turndown-based HTML-to-markdown with YAML frontmatter from metadata. Strips scripts, styles, nav, footer, forms, SVG.
4. **Headers** (`headers.ts`) — Builds `Content-Type: text/markdown`, `Vary`, `X-Content-Source`, optional IETF AIPREF `Content-Usage`, optional token count.

Both framework adapters wrap the entire transformation in try/catch and fall back to the original HTML response on any error.

## Key Design Decisions

- **Express adapter** intercepts via monkey-patching `res.send()` (in-process, efficient)
- **Next.js adapter** uses internal `fetch()` with bypass header (edge middleware can't access response body directly)
- **Glob matching differs**: Express uses `picomatch`, Next.js uses a hand-rolled `globToRegex` — potential behavioral inconsistency
- **Known agents** (`agents.ts`): 14 AI user-agent patterns (GPTBot, ClaudeBot, PerplexityBot, etc.) as case-insensitive regexes
- **Token estimation** (`tokens.ts`): simple `ceil(length / 4)` heuristic
- **Version `0.1.0`** is hardcoded in `headers.ts` rather than read from package.json
