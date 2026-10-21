# Inkawasi · Carta web

[English](README.md) · **Español**

Carta digital multilingüe de **Inkawasi**, cocina tradicional peruana en Ferrol (Galicia). Es un sitio **estático pre-renderizado en 10 idiomas** (es, en, fr, it, de, pt, gl, ar, zh, ru), con alérgenos, accesibilidad AA y datos estructurados para buscadores. Se escanea desde un QR en la mesa, así que prioriza la carga rápida en móvil.

Este proyecto es el resultado de auditar y refactorizar una primera versión generada con una herramienta de diseño. Resumen de la auditoría y las decisiones más abajo.

## Resultados

Lighthouse en móvil (throttling simulado, mediana de 3 ejecuciones), versión original frente a la actual:

| Métrica                      | Original | Refactor   |
| ---------------------------- | -------- | ---------- |
| Rendimiento                  | 44       | **95**     |
| Accesibilidad                | 86       | **100**    |
| Buenas prácticas             | 96       | **100**    |
| SEO                          | 82       | **100**    |
| LCP                          | 6,7 s    | **2,6 s**  |
| CLS                          | 0,73     | **0,01**   |
| Peso transferido             | 847 KB   | **297 KB** |
| Peticiones                   | 36       | **14**     |
| Hosts de terceros en runtime | 4+ CDNs  | **0**      |
| JavaScript propio            | ~220 KB  | **2,2 KB** |

## Stack

Vite · TypeScript estricto · CSS con capas (`@layer`) y tokens del design system · Vitest · Playwright + axe-core · ESLint · Prettier · GitHub Actions. Sin framework: el sitio es HTML que ya viene escrito y un poco de JS para mejorarlo.

## Cómo funciona

```
src/data/        platos, secciones, alérgenos y precios (en céntimos) tipados
src/i18n/        un JSON por idioma; el tipo se deriva del español, así que una clave
                 que falte en cualquier idioma es un error de compilación
src/render/      funciones puras  (contexto → HTML)  con escapado automático
src/client/      mejora progresiva: pestañas, menú de idioma, preferencia guardada
scripts/         prerender (una página por idioma), sitemap, optimización de imágenes
tests/           unitarios (Vitest) y e2e + accesibilidad (Playwright)
```

1. `vite build` compila CSS/JS y deja `dist/index.html` como plantilla.
2. `scripts/prerender.ts` genera `dist/carta/index.html` (es) y `dist/<idioma>/carta/index.html` con todo el menú ya escrito, metadatos, `hreflang` y JSON-LD (`Restaurant` + `Menu`).
3. En desarrollo, un plugin de Vite renderiza esas mismas páginas, así que `npm run dev` muestra lo que se publica.

### Estructura de URLs

| URL                         | Qué es                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| `/carta/`                   | Carta en español (idioma por defecto). **La URL de los QR de las mesas.** |
| `/en/carta/`, `/gl/carta/`… | Carta en cada uno de los otros 9 idiomas                                  |
| `/`, `/en/`…                | Redirigen a la carta correspondiente, hasta que exista una home           |
| `/aviso-legal/`             | Aviso legal (LSSI). Solo en español; borrador hasta que se apruebe        |
| `/privacidad/`              | Política de privacidad (RGPD). Solo en español; borrador hasta aprobarla  |

La carta cuelga de `/carta/` para que una home pueda ocupar `/` más adelante sin cambiar ninguna URL impresa. Las raíces redirigen con un `302` real (`dist/_redirects`, que leen Cloudflare Pages y Netlify) y con una página estática de respaldo para cualquier otro alojamiento.

## Decisiones

- **Pre-renderizado en lugar de SPA.** El original cargaba los datos con `import()` tras montar, así que el primer pintado estaba vacío y un buscador no veía ningún plato. Ahora el menú está en el HTML.
- **Una URL por idioma, no un estado.** `/en/`, `/gl/`… son páginas reales, enlazables y indexables. El selector de idioma son enlaces dentro de un `<details>`, así que funciona sin JavaScript.
- **Redirección de idioma sin dañar el SEO.** Solo desde la raíz, usando la elección guardada o el idioma del navegador, y nunca para rastreadores. La función que decide es la misma que ejecutan los tests.
- **Sin dependencias externas en runtime.** Fuentes autoalojadas con subconjuntos por `unicode-range` (el navegador descarga solo latín o cirílico según el idioma), iconos y banderas inline.
- **Precios como enteros (céntimos)** formateados con `Intl.NumberFormat` por idioma.
- **Plantillas con escapado por defecto** (`html\`\``), sin `innerHTML` con datos sin sanear.
- **Árabe en RTL de verdad:** `dir` y `lang` en `<html>`, propiedades lógicas de CSS, sin `letter-spacing` (rompería la unión de letras) y precios aislados con `unicode-bidi`.
- **Contraste AA.** Dos tonos del design system (`gold-700`, `terra-500`) no llegan a 4,5:1 sobre crema para texto pequeño; se añadieron `--gold-800` y `--terra-700` solo para texto.

## Qué corrigió la auditoría

- Runtime propietario de 60 KB + andamio de editor de 31 KB + bundle del design system de 88 KB, todo para pintar una carta.
- Sin `<title>`, meta description, `lang`, landmark `main`; contraste insuficiente; CLS de 0,73.
- Estilos inline por todas partes y hacks con `!important` que recortaban las pestañas con nombres largos ("Accompagnements").
- Textos fijos en español (reseña, "Cómo llegar") que no se traducían.
- **Error de datos:** en gallego, "cacahuete" estaba traducido como "Améndoas" (almendras), un alérgeno distinto. Además, "patatas frito" en la descripción del Mostrito.
- `lucide@latest` sin versión fijada, cargado desde unpkg.
- Logo de 195 KB (2670 px) para mostrarse a 50 px de alto: ahora 17 KB.

## Comandos

```bash
npm install
npm run dev            # servidor de desarrollo con las 10 páginas
npm run build          # tipos + build + pre-render  → dist/
npm run preview        # sirve dist/
npm test               # unitarios (251)
npm run test:e2e       # e2e + accesibilidad (74), construye antes
npm run lint && npm run format:check && npm run typecheck
npm run optimize:images
npm run build:og       # regenera public/og-image.png (1200×630) con Playwright
```

## Cómo cambiar cosas

| Para cambiar…                      | Edita                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Un precio, un plato, sus alérgenos | `src/data/menu.ts` (precios en céntimos: `1450` es 14,50€). Textos por idioma: `src/i18n/locales/<idioma>.json`              |
| El horario o el día cerrado        | `src/data/hours.ts`. El pie de página y el JSON-LD (`openingHoursSpecification`) leen de ahí                                 |
| Un mensaje de WhatsApp             | `src/data/whatsapp.ts` (en español, lo lee el personal). Etiquetas de los botones por idioma: `ui.wa*` en los JSON de idioma |
| Teléfono, dirección, enlaces       | `src/render/contact.ts`                                                                                                      |
| El menú del día                    | Aún no es editable: llega con el CMS en la etapa 4 de `docs/plan-web.md`                                                     |
| Un cierre puntual (vacaciones)     | Aún no es editable: también en la etapa 4 (CMS)                                                                              |

`npm test` comprueba cada cambio: un plato sin precio o sin descripción en los 10 idiomas, o un alérgeno fuera de los 14 oficiales, rompe el build.

## Datos confidenciales

Los datos del titular para las páginas legales (nombre, NIE, domicilio) **no están en git**. Viven en `private/negocio.privado.json`, ignorado por git; solo se versiona la plantilla `private/negocio.privado.example.json`. El build lo lee y nunca lo escribe (el archivo es de solo lectura). En CI, el mismo JSON se pasa como secreto `INKAWASI_PRIVATE_JSON`. Un build con `SITE_URL` se niega a publicar datos de ejemplo, y un test unitario falla si el NIE real aparece en algún archivo versionado. Los secretos técnicos (Cloudflare, Resend, Turnstile) van en variables de entorno, nunca en ese archivo.

Las páginas legales siguen en `noindex` y marcadas como borrador hasta que `LEGAL_DRAFT` en `src/data/legal.ts` pase a `false`.

## Despliegue

`.github/workflows/ci.yml` ejecuta formato, lint, tipos, tests unitarios y e2e en cada push y pull request.

El destino de producción será Cloudflare Pages con el dominio `inkawasi.es` (pendiente de contratar). Para activar canonical, `hreflang` y `sitemap.xml` hay que definir el dominio al construir:

```bash
SITE_URL=https://inkawasi.es BASE_PATH=/ npm run build
```

## Pendiente

- Dominio `inkawasi.es` y despliegue en Cloudflare Pages.
- Revisar los textos legales y poner `LEGAL_DRAFT` en `false`.
- Sustituir la imagen Open Graph por una con foto del local.
- Logo, fotos y marca pertenecen a Inkawasi.
