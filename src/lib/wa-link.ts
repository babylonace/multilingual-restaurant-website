/**
 * `https://wa.me/<number>?text=<message>`; the number is digits only, with country code.
 * Kept apart from `lib/whatsapp.ts` (which needs every locale) so the browser script can use it.
 */
export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
