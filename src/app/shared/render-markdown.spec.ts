import { renderMarkdownToHtml } from './render-markdown';

describe('renderMarkdownToHtml', () => {
  it('converts headings, paragraphs, and lists to HTML', () => {
    const html = renderMarkdownToHtml('# Heading\n\nA paragraph.\n\n- one\n- two');

    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<p>A paragraph.</p>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  it('strips a script tag injected as raw HTML', () => {
    const html = renderMarkdownToHtml('# Title\n\n<script>alert("xss")</script>');

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert');
  });

  it('strips an event handler attribute injected as raw HTML', () => {
    const html = renderMarkdownToHtml('<img src="x" onerror="alert(1)">');

    expect(html).not.toContain('onerror');
  });
});
