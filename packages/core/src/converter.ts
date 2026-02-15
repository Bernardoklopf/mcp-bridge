import TurndownService from 'turndown';
import type { PageMetadata } from './types.js';

/**
 * Builds a YAML frontmatter block from page metadata.
 */
function buildFrontmatter(metadata: PageMetadata): string {
  const lines: string[] = ['---'];

  if (metadata.title) lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
  if (metadata.url) lines.push(`url: ${metadata.url}`);
  if (metadata.description) {
    lines.push(`description: "${metadata.description.replace(/"/g, '\\"')}"`);
  }
  if (metadata.language) lines.push(`language: ${metadata.language}`);
  if (metadata.siteName) lines.push(`site: "${metadata.siteName.replace(/"/g, '\\"')}"`);

  lines.push('---');
  return lines.join('\n');
}

/**
 * Creates a configured TurndownService instance.
 */
function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  // Remove unwanted elements
  turndown.remove([
    'script',
    'style',
    'iframe',
    'form',
    'input',
    'button',
    'select',
    'textarea',
    'noscript',
    'nav',
    'footer',
  ]);

  // SVG is in SVGElementTagNameMap, handle separately
  turndown.addRule('removeSvg', {
    filter: (node) => node.nodeName.toLowerCase() === 'svg',
    replacement: () => '',
  });

  // Handle images: show alt text + URL
  turndown.addRule('images', {
    filter: 'img',
    replacement(_content, node) {
      const el = node as HTMLElement;
      const alt = el.getAttribute('alt') || '';
      const src = el.getAttribute('src') || '';
      if (!src) return alt;
      return alt ? `![${alt}](${src})` : `![image](${src})`;
    },
  });

  return turndown;
}

/**
 * Converts extracted HTML content to markdown with frontmatter.
 */
export function convertToMarkdown(
  html: string,
  metadata: PageMetadata,
): string {
  const turndown = createTurndown();
  const markdown = turndown.turndown(html);

  // Build frontmatter only if we have metadata
  const hasMeta = metadata.title || metadata.url || metadata.description;
  const frontmatter = hasMeta ? buildFrontmatter(metadata) + '\n\n' : '';

  // Clean up excessive blank lines
  const cleaned = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return frontmatter + cleaned + '\n';
}
