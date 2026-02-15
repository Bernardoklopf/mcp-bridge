import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import type { ExtractConfig, ExtractionResult, PageMetadata } from './types.js';

function getMetaContent(doc: Document, name: string): string | undefined {
  const el =
    doc.querySelector(`meta[name="${name}"]`) ??
    doc.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute('content') ?? undefined;
}

function extractMetadata(doc: Document, url?: string): PageMetadata {
  return {
    title: doc.title || undefined,
    description:
      getMetaContent(doc, 'description') ??
      getMetaContent(doc, 'og:description'),
    url:
      url ??
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      undefined,
    language: doc.documentElement?.getAttribute('lang') ?? undefined,
    siteName: getMetaContent(doc, 'og:site_name'),
  };
}

/**
 * Removes elements marked with data-llm-ignore from the document.
 */
function removeIgnoredElements(doc: Document): void {
  const ignored = doc.querySelectorAll('[data-llm-ignore]');
  for (const el of ignored) {
    el.remove();
  }
}

/**
 * Checks for data-llm-content annotated elements.
 * If present, returns only the content within those elements.
 */
function extractAnnotatedContent(doc: Document): string | null {
  const annotated = doc.querySelectorAll('[data-llm-content]');
  if (annotated.length === 0) return null;

  const parts: string[] = [];
  for (const el of annotated) {
    parts.push(el.innerHTML);
  }
  return parts.join('\n');
}

/**
 * Processes data-llm-hint attributes by inserting hint text before the element.
 */
function processHints(doc: Document): void {
  const hinted = doc.querySelectorAll('[data-llm-hint]');
  for (const el of hinted) {
    const hint = el.getAttribute('data-llm-hint');
    if (hint) {
      const comment = doc.createElement('p');
      comment.textContent = `[${hint}]`;
      el.parentNode?.insertBefore(comment, el);
    }
  }
}

/**
 * Extracts main content from HTML string.
 * Respects data-llm-* annotations when enabled.
 * Falls back to Readability or full body based on config.
 */
export function extractContent(
  html: string,
  config: ExtractConfig = {},
  url?: string,
): ExtractionResult {
  const { annotations = true, fallback = 'readability', maxLength = 100_000 } = config;

  const { document: doc } = parseHTML(html);
  const metadata = extractMetadata(doc, url);

  // Remove ignored elements first
  if (annotations) {
    removeIgnoredElements(doc);
    processHints(doc);
  }

  let contentHtml: string;

  // Try annotation-based extraction first
  if (annotations) {
    const annotated = extractAnnotatedContent(doc);
    if (annotated) {
      contentHtml = annotated;
      return finalize(contentHtml, metadata, maxLength);
    }
  }

  // Readability extraction
  if (fallback === 'readability') {
    try {
      const reader = new Readability(doc as unknown as Document, {
        charThreshold: 0,
      });
      const article = reader.parse();
      if (article?.content) {
        if (article.title && !metadata.title) {
          metadata.title = article.title;
        }
        contentHtml = article.content;
        return finalize(contentHtml, metadata, maxLength);
      }
    } catch {
      // Fall through to body fallback
    }
  }

  // Body fallback
  contentHtml = doc.body?.innerHTML ?? html;
  return finalize(contentHtml, metadata, maxLength);
}

function finalize(
  contentHtml: string,
  metadata: PageMetadata,
  maxLength: number,
): ExtractionResult {
  const truncated =
    contentHtml.length > maxLength
      ? contentHtml.slice(0, maxLength)
      : contentHtml;
  return { content: truncated, metadata };
}
