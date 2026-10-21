/**
 * Minimal tagged-template HTML renderer with escaping by default.
 *
 * Every interpolated value is HTML-escaped unless it is a `SafeHtml` (the result of
 * another `html` call or an explicit `raw`). Arrays are rendered item by item, and
 * `null`, `undefined` and `false` render nothing, so conditionals read naturally:
 *
 *   html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>${hasFooter && html`<p>…</p>`}`
 */
export class SafeHtml {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Marks a string as already-safe markup (SVG sprites, JSON-LD, build-time constants). */
export function raw(value: string): SafeHtml {
  return new SafeHtml(value);
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? '';
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + (strings[i + 1] ?? '');
  }
  return new SafeHtml(out);
}
