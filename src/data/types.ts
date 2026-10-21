import type { Locale } from '../i18n';
import type { DISHES } from './menu';

export type LangCode = 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt' | 'gl' | 'ar' | 'zh' | 'ru';

export type FlagId = 'es' | 'gb' | 'fr' | 'it' | 'de' | 'pt' | 'gl' | 'sa' | 'cn' | 'ru';

export interface LangDef {
  code: LangCode;
  /** Endonym: the language written in itself. */
  label: string;
  flag: FlagId;
  rtl?: boolean;
}

export type AllergenKey =
  | 'gluten'
  | 'crustaceos'
  | 'huevos'
  | 'pescado'
  | 'cacahuete'
  | 'soja'
  | 'lacteos'
  | 'sesamo'
  | 'apio'
  | 'mostaza'
  | 'sulfitos'
  | 'moluscos'
  | 'frutosCascara'
  | 'altramuces';

/** Days on which a dish is served when it is not on the regular menu. */
export type Availability = 'sun' | 'satsun';

export interface Dish {
  id: string;
  /** Authentic name, deliberately not translated. */
  name: string;
  /** Price in euro cents, so formatting is the only place that knows about decimals. */
  priceCents: number;
  allergens: readonly AllergenKey[];
  availability?: Availability;
}

export type DishId = keyof typeof DISHES;

/** Dishes that have a written description (everything except drinks). Derived from the locale files. */
export type FoodId = keyof Locale['descriptions'];

export type SectionId = 'entrantes' | 'sopas' | 'marino' | 'wok' | 'criollo' | 'porciones';

export interface Section {
  id: SectionId;
  dishes: readonly FoodId[];
}

export type TabId = SectionId | 'bebidas';
