import type { AllergenKey, Dish, DishId, FoodId, Section } from './types';

export const ALLERGEN_KEYS = [
  'gluten',
  'crustaceos',
  'huevos',
  'pescado',
  'cacahuete',
  'soja',
  'lacteos',
  'sesamo',
  'apio',
  'mostaza',
  'sulfitos',
  'moluscos',
] as const satisfies readonly AllergenKey[];

export const DISHES = {
  tamal: { id: 'tamal', name: 'Tamal de cerdo', priceCents: 500, allergens: [] },
  salchipapa: {
    id: 'salchipapa',
    name: 'Salchipapa',
    priceCents: 800,
    allergens: ['gluten', 'huevos', 'mostaza', 'sulfitos'],
  },
  huancaina: {
    id: 'huancaina',
    name: 'Papa a la Huancaína',
    priceCents: 500,
    allergens: ['lacteos', 'huevos', 'gluten'],
  },
  causaLimena: {
    id: 'causaLimena',
    name: 'Causa Limeña',
    priceCents: 1000,
    allergens: ['huevos'],
    availability: 'sun',
  },
  caldoGallina: {
    id: 'caldoGallina',
    name: 'Caldo de Gallina',
    priceCents: 1200,
    allergens: ['gluten', 'huevos', 'apio'],
    availability: 'satsun',
  },
  caldoMote: {
    id: 'caldoMote',
    name: 'Caldo de Mote',
    priceCents: 1300,
    allergens: ['apio'],
    availability: 'sun',
  },
  ceviche: { id: 'ceviche', name: 'Ceviche', priceCents: 1450, allergens: ['pescado'] },
  lecheTigre: {
    id: 'lecheTigre',
    name: 'Leche de Tigre',
    priceCents: 1000,
    allergens: ['pescado', 'apio'],
  },
  causaAcevichada: {
    id: 'causaAcevichada',
    name: 'Causa Acevichada',
    priceCents: 1200,
    allergens: ['pescado', 'huevos'],
    availability: 'sun',
  },
  arrozChaufa: {
    id: 'arrozChaufa',
    name: 'Arroz Chaufa',
    priceCents: 1100,
    allergens: ['soja', 'gluten', 'huevos', 'sesamo'],
  },
  aeropuerto: {
    id: 'aeropuerto',
    name: 'Aeropuerto',
    priceCents: 1200,
    allergens: ['soja', 'gluten', 'huevos', 'sesamo'],
  },
  mostrito: {
    id: 'mostrito',
    name: 'Mostrito',
    priceCents: 1500,
    allergens: ['gluten', 'soja', 'huevos', 'sesamo'],
  },
  tallarinChifa: {
    id: 'tallarinChifa',
    name: 'Tallarín Chifa',
    priceCents: 1300,
    allergens: ['gluten', 'soja', 'sesamo'],
  },
  combinadoChifa: {
    id: 'combinadoChifa',
    name: 'Combinado de Chifa',
    priceCents: 1500,
    allergens: ['gluten', 'soja', 'huevos', 'sesamo'],
  },
  lomoSaltado: {
    id: 'lomoSaltado',
    name: 'Lomo Saltado',
    priceCents: 1400,
    allergens: ['soja', 'gluten'],
  },
  chicharron: { id: 'chicharron', name: 'Chicharrón de Cerdo', priceCents: 1200, allergens: [] },
  combinadoCriollo: {
    id: 'combinadoCriollo',
    name: 'Combinado Criollo',
    priceCents: 1500,
    allergens: ['pescado', 'gluten', 'soja', 'lacteos', 'huevos', 'sesamo'],
    availability: 'sun',
  },
  polloBroaster: {
    id: 'polloBroaster',
    name: 'Pollo Broaster',
    priceCents: 1200,
    allergens: ['gluten', 'huevos'],
  },
  polloPlancha: { id: 'polloPlancha', name: 'Pollo a la Plancha', priceCents: 1200, allergens: [] },
  patatasFritas: { id: 'patatasFritas', name: 'Patatas Fritas', priceCents: 400, allergens: [] },
  ensaladaSimple: { id: 'ensaladaSimple', name: 'Ensalada Simple', priceCents: 400, allergens: [] },
  arrozBlanco: { id: 'arrozBlanco', name: 'Arroz Blanco', priceCents: 400, allergens: [] },
  wantanes: { id: 'wantanes', name: 'Wantanes', priceCents: 500, allergens: ['gluten', 'huevos'] },
  chichaMorada: { id: 'chichaMorada', name: 'Chicha Morada 1 L', priceCents: 1200, allergens: [] },
  inkaKola: { id: 'inkaKola', name: 'Inka Kola', priceCents: 300, allergens: [] },
  cocaCola: { id: 'cocaCola', name: 'Coca Cola', priceCents: 250, allergens: [] },
  sprite: { id: 'sprite', name: 'Sprite', priceCents: 250, allergens: [] },
  fuzeTea: { id: 'fuzeTea', name: 'Fuze Tea', priceCents: 280, allergens: [] },
  aquarius: { id: 'aquarius', name: 'Aquarius', priceCents: 280, allergens: [] },
  cusquenaTrigo: { id: 'cusquenaTrigo', name: 'Cusqueña de Trigo', priceCents: 300, allergens: [] },
  cusquenaNegra: { id: 'cusquenaNegra', name: 'Cusqueña Negra', priceCents: 300, allergens: [] },
  pilsen: { id: 'pilsen', name: 'Pilsen', priceCents: 300, allergens: [] },
  estrellaGalicia: {
    id: 'estrellaGalicia',
    name: 'Estrella de Galicia',
    priceCents: 250,
    allergens: [],
  },
  estrella1906: { id: 'estrella1906', name: 'Estrella 1906', priceCents: 280, allergens: [] },
} as const satisfies Record<string, Dish>;

export const SECTIONS: readonly Section[] = [
  { id: 'entrantes', dishes: ['tamal', 'salchipapa', 'huancaina', 'causaLimena'] },
  { id: 'sopas', dishes: ['caldoGallina', 'caldoMote'] },
  { id: 'marino', dishes: ['ceviche', 'lecheTigre', 'causaAcevichada'] },
  {
    id: 'wok',
    dishes: ['arrozChaufa', 'aeropuerto', 'mostrito', 'tallarinChifa', 'combinadoChifa'],
  },
  {
    id: 'criollo',
    dishes: ['lomoSaltado', 'chicharron', 'combinadoCriollo', 'polloBroaster', 'polloPlancha'],
  },
  { id: 'porciones', dishes: ['patatasFritas', 'ensaladaSimple', 'arrozBlanco', 'wantanes'] },
];

export const SOFT_DRINKS: readonly DishId[] = [
  'chichaMorada',
  'inkaKola',
  'cocaCola',
  'sprite',
  'fuzeTea',
  'aquarius',
];
export const BEERS: readonly DishId[] = [
  'cusquenaTrigo',
  'cusquenaNegra',
  'pilsen',
  'estrellaGalicia',
  'estrella1906',
];

/** Dishes highlighted in the "favorites" carousel, with the tab each one belongs to. */
export const FAVORITES: readonly { dish: FoodId; section: Section['id']; image: string }[] = [
  { dish: 'huancaina', section: 'entrantes', image: 'g-huancaina' },
  { dish: 'arrozChaufa', section: 'wok', image: 'g-chaufa' },
  { dish: 'mostrito', section: 'wok', image: 'g-mostrito' },
  { dish: 'lomoSaltado', section: 'criollo', image: 'g-lomo' },
  { dish: 'ceviche', section: 'marino', image: 'g-ceviche' },
  { dish: 'causaAcevichada', section: 'marino', image: 'g-causa' },
];
