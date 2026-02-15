import { describe, it, expect } from 'vitest';
import { convertToMarkdown } from '../converter.js';

describe('convertToMarkdown', () => {
  describe('frontmatter', () => {
    it('generates frontmatter with metadata', () => {
      const md = convertToMarkdown('<p>Hello</p>', {
        title: 'Test Page',
        url: 'https://example.com',
        description: 'A test page',
      });
      expect(md).toContain('---');
      expect(md).toContain('title: "Test Page"');
      expect(md).toContain('url: https://example.com');
      expect(md).toContain('description: "A test page"');
    });

    it('skips frontmatter when no metadata', () => {
      const md = convertToMarkdown('<p>Hello</p>', {});
      expect(md).not.toContain('---');
    });

    it('escapes quotes in metadata', () => {
      const md = convertToMarkdown('<p>Hello</p>', {
        title: 'Page "with" quotes',
      });
      expect(md).toContain('title: "Page \\"with\\" quotes"');
    });

    it('includes language and site name', () => {
      const md = convertToMarkdown('<p>Hello</p>', {
        title: 'Test',
        language: 'en',
        siteName: 'My Site',
      });
      expect(md).toContain('language: en');
      expect(md).toContain('site: "My Site"');
    });
  });

  describe('HTML to markdown conversion', () => {
    it('converts headings', () => {
      const md = convertToMarkdown(
        '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>',
        {},
      );
      expect(md).toContain('# Title');
      expect(md).toContain('## Subtitle');
      expect(md).toContain('### Section');
    });

    it('converts paragraphs', () => {
      const md = convertToMarkdown(
        '<p>First paragraph</p><p>Second paragraph</p>',
        {},
      );
      expect(md).toContain('First paragraph');
      expect(md).toContain('Second paragraph');
    });

    it('converts unordered lists', () => {
      const md = convertToMarkdown(
        '<ul><li>Item 1</li><li>Item 2</li></ul>',
        {},
      );
      expect(md).toContain('Item 1');
      expect(md).toContain('Item 2');
      expect(md).toMatch(/^-/m);
    });

    it('converts ordered lists', () => {
      const md = convertToMarkdown(
        '<ol><li>First</li><li>Second</li></ol>',
        {},
      );
      expect(md).toContain('1.  First');
      expect(md).toContain('2.  Second');
    });

    it('converts links', () => {
      const md = convertToMarkdown(
        '<a href="https://example.com">Click here</a>',
        {},
      );
      expect(md).toContain('[Click here](https://example.com)');
    });

    it('converts bold and italic', () => {
      const md = convertToMarkdown(
        '<strong>Bold</strong> and <em>italic</em>',
        {},
      );
      expect(md).toContain('**Bold**');
      expect(md).toContain('*italic*');
    });

    it('converts code blocks', () => {
      const md = convertToMarkdown(
        '<pre><code>const x = 1;</code></pre>',
        {},
      );
      expect(md).toContain('```');
      expect(md).toContain('const x = 1;');
    });

    it('converts inline code', () => {
      const md = convertToMarkdown(
        '<p>Use <code>npm install</code> to start</p>',
        {},
      );
      expect(md).toContain('`npm install`');
    });

    it('converts images with alt text', () => {
      const md = convertToMarkdown(
        '<img src="https://example.com/img.png" alt="A screenshot">',
        {},
      );
      expect(md).toContain('![A screenshot](https://example.com/img.png)');
    });

    it('converts tables', () => {
      const md = convertToMarkdown(
        '<table><thead><tr><th>Name</th><th>Price</th></tr></thead><tbody><tr><td>Widget</td><td>$10</td></tr></tbody></table>',
        {},
      );
      expect(md).toContain('Name');
      expect(md).toContain('Price');
      expect(md).toContain('Widget');
      expect(md).toContain('$10');
    });
  });

  describe('cleanup', () => {
    it('removes excessive blank lines', () => {
      const md = convertToMarkdown(
        '<p>A</p><br><br><br><br><p>B</p>',
        {},
      );
      expect(md).not.toMatch(/\n{4,}/);
    });

    it('trims trailing whitespace', () => {
      const md = convertToMarkdown('<p>Content</p>', {});
      expect(md).toMatch(/\n$/);
      expect(md).not.toMatch(/\n\n$/);
    });
  });
});
