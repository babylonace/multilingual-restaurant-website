import { describe, expect, it } from 'vitest';
import { escapeHtml, html, raw } from '../../src/lib/html';

describe('html template', () => {
  it('escapes interpolated strings', () => {
    const evil = `<script>alert("x")</script> & 'q'`;
    expect(html`<p>${evil}</p>`.toString()).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;</p>',
    );
  });

  it('escapes attribute values', () => {
    expect(html`<a title="${'" onclick="x'}"></a>`.toString()).toBe(
      '<a title="&quot; onclick=&quot;x"></a>',
    );
  });

  it('does not double-escape nested html results', () => {
    const inner = html`<b>${'a & b'}</b>`;
    expect(html`<p>${inner}</p>`.toString()).toBe('<p><b>a &amp; b</b></p>');
  });

  it('renders arrays item by item', () => {
    const items = ['a', 'b'].map((x) => html`<li>${x}</li>`);
    expect(html`${items}`.toString()).toBe('<li>a</li><li>b</li>');
  });

  it('renders nothing for null, undefined and false, but keeps 0', () => {
    expect(html`[${null}${undefined}${false}${0}]`.toString()).toBe('[0]');
  });

  it('trusts raw() content as-is', () => {
    expect(html`${raw('<svg/>')}`.toString()).toBe('<svg/>');
  });

  it('escapeHtml leaves safe text untouched', () => {
    expect(escapeHtml('Papa a la Huancaína — 5 €')).toBe('Papa a la Huancaína — 5 €');
  });
});
