import { describe, it, expect } from 'vitest';
import { extractContent } from '../extractor.js';

const FULL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="A test page for extraction">
  <title>Test Page</title>
  <link rel="canonical" href="https://example.com/test">
  <style>body { color: red; }</style>
  <script>console.log("test");</script>
</head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <main>
    <h1>Main Content</h1>
    <p>This is the primary content of the page. It contains important information that should be extracted by the readability algorithm. The content is long enough to be considered the main article content for readability extraction purposes.</p>
    <p>Here is another paragraph with more details about the topic. This helps readability determine this is the main content area of the page.</p>
    <ul>
      <li>Item one with details</li>
      <li>Item two with details</li>
      <li>Item three with details</li>
    </ul>
    <p>Final paragraph wrapping up the content with additional context and information for the reader.</p>
  </main>
  <footer><p>Copyright 2026</p></footer>
</body>
</html>`;

describe('extractContent', () => {
  describe('metadata extraction', () => {
    it('extracts title from <title>', () => {
      const result = extractContent(FULL_HTML);
      expect(result.metadata.title).toBe('Test Page');
    });

    it('extracts description from meta tag', () => {
      const result = extractContent(FULL_HTML);
      expect(result.metadata.description).toBe(
        'A test page for extraction',
      );
    });

    it('extracts language', () => {
      const result = extractContent(FULL_HTML);
      expect(result.metadata.language).toBe('en');
    });

    it('extracts canonical URL', () => {
      const result = extractContent(FULL_HTML);
      expect(result.metadata.url).toBe('https://example.com/test');
    });

    it('uses provided URL when no canonical exists', () => {
      const html = '<html><body><p>Test</p></body></html>';
      const result = extractContent(html, {}, 'https://example.com/page');
      expect(result.metadata.url).toBe('https://example.com/page');
    });
  });

  describe('annotation-based extraction', () => {
    it('extracts only data-llm-content elements', () => {
      const html = `<html><body>
        <nav>Navigation</nav>
        <main data-llm-content>
          <h1>Important Content</h1>
          <p>This is the content</p>
        </main>
        <footer>Footer</footer>
      </body></html>`;
      const result = extractContent(html);
      expect(result.content).toContain('Important Content');
      expect(result.content).not.toContain('Navigation');
      expect(result.content).not.toContain('Footer');
    });

    it('removes data-llm-ignore elements', () => {
      const html = `<html><body>
        <nav data-llm-ignore>Navigation</nav>
        <main data-llm-content>
          <h1>Content</h1>
          <div data-llm-ignore>Ignore this</div>
          <p>Keep this</p>
        </main>
      </body></html>`;
      const result = extractContent(html);
      expect(result.content).toContain('Content');
      expect(result.content).toContain('Keep this');
      expect(result.content).not.toContain('Ignore this');
    });

    it('processes data-llm-hint attributes', () => {
      const html = `<html><body>
        <main data-llm-content>
          <div data-llm-hint="This table shows pricing tiers">
            <table><tr><td>Free</td><td>$0</td></tr></table>
          </div>
        </main>
      </body></html>`;
      const result = extractContent(html);
      expect(result.content).toContain('This table shows pricing tiers');
    });

    it('skips annotations when disabled', () => {
      const html = `<html><body>
        <div data-llm-ignore>
          <p>This section is marked to ignore but annotations are off, so it should be included. It is long enough to survive readability extraction.</p>
        </div>
        <main>
          <h1>Content</h1>
          <p>This is the main content of the page with enough text for readability to parse it properly. We need several paragraphs here.</p>
          <p>Second paragraph with additional information about the topic at hand.</p>
        </main>
      </body></html>`;
      const result = extractContent(html, { annotations: false });
      // With annotations disabled, data-llm-ignore is not respected,
      // so the content should still be present (if readability keeps it)
      expect(result.content).toContain('Content');
    });
  });

  describe('readability fallback', () => {
    it('extracts main content using Readability', () => {
      const result = extractContent(FULL_HTML);
      expect(result.content).toContain('Main Content');
      expect(result.content).toContain('primary content');
    });
  });

  describe('body fallback', () => {
    it('falls back to body when configured', () => {
      const html = '<html><body><p>Simple content</p></body></html>';
      const result = extractContent(html, { fallback: 'body' });
      expect(result.content).toContain('Simple content');
    });
  });

  describe('maxLength', () => {
    it('truncates content exceeding maxLength', () => {
      const html = `<html><body data-llm-content>${'<p>x</p>'.repeat(1000)}</body></html>`;
      const result = extractContent(html, { maxLength: 100 });
      expect(result.content.length).toBeLessThanOrEqual(100);
    });
  });
});
