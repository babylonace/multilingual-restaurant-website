import type { RenderedPage } from './page';

export const PLACEHOLDERS = ['{{lang}}', '{{dir}}', '<!--app-head-->', '<!--app-body-->'] as const;

/** Fills the `index.html` shell with one rendered page. Replacers are functions so `$` in content is literal. */
export function applyTemplate(template: string, page: RenderedPage): string {
  return template
    .replace('{{lang}}', () => page.lang)
    .replace('{{dir}}', () => page.dir)
    .replace('<!--app-head-->', () => page.head)
    .replace('<!--app-body-->', () => page.body);
}
