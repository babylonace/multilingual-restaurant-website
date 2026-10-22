import { describe, expect, it } from 'vitest';
import { renderNotFoundPage } from '../../src/render/not-found';
import { TEST_PICTURES } from './fixtures';

describe('404 page', () => {
  const page = renderNotFoundPage({
    lang: 'es',
    base: '/',
    pictures: TEST_PICTURES,
    siteUrl: 'https://example.test',
  });

  it('is never indexed and has no canonical', () => {
    expect(page.head).toContain('<meta name="robots" content="noindex" />');
    expect(page.head).not.toContain('rel="canonical"');
  });

  it('sends people to the carta and the home with absolute paths', () => {
    expect(page.body).toContain('href="/carta/"');
    expect(page.body).toContain('href="/"');
  });

  it('respects a base path', () => {
    const sub = renderNotFoundPage({
      lang: 'es',
      base: '/repo/',
      pictures: TEST_PICTURES,
      siteUrl: undefined,
    });
    expect(sub.body).toContain('href="/repo/carta/"');
    expect(sub.body).toContain('src="/repo/assets/logo.webp"');
  });
});
