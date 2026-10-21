import type { LangDef } from './types';

export const LANGS: readonly LangDef[] = [
  { code: 'es', label: 'Español', flag: 'es' },
  { code: 'en', label: 'English', flag: 'gb' },
  { code: 'fr', label: 'Français', flag: 'fr' },
  { code: 'it', label: 'Italiano', flag: 'it' },
  { code: 'de', label: 'Deutsch', flag: 'de' },
  { code: 'pt', label: 'Português', flag: 'pt' },
  { code: 'gl', label: 'Galego', flag: 'gl' },
  { code: 'ar', label: 'العربية', flag: 'sa', rtl: true },
  { code: 'zh', label: '中文', flag: 'cn' },
  { code: 'ru', label: 'Русский', flag: 'ru' },
];
