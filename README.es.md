# Inkawasi · Carta web

[English](README.md) · **Español**

Carta digital multilingüe de **Inkawasi**, cocina tradicional peruana en Ferrol (Galicia). Es un sitio **estático pre-renderizado en 10 idiomas** (es, en, fr, it, de, pt, gl, ar, zh, ru), con alérgenos, accesibilidad AA y datos estructurados para buscadores. Se escanea desde un QR en la mesa, así que prioriza la carga rápida en móvil.

Este proyecto es el resultado de auditar y refactorizar una primera versión generada con una herramienta de diseño. Resumen de la auditoría y las decisiones más abajo.

**En vivo:** [inkawasi.es](https://inkawasi.es) · [carta en español](https://inkawasi.es/carta/)

| Inicio, móvil                                                                                                                                                 | Carta, móvil                                                                                                                                        | Inicio, escritorio                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| <img src="docs/images/home-mobile.webp" alt="Inicio en el móvil: foto del restaurante, título y botones de la carta, el menú del día y WhatsApp" width="220"> | <img src="docs/images/carta-mobile.webp" alt="Carta en inglés en el móvil: platos favoritos con foto y precio, y pestañas por sección" width="220"> | <img src="docs/images/home-desktop.webp" alt="Inicio en una pantalla de escritorio" width="420"> |

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

Astro 7 como herramienta de build (genera HTML estático; no envía framework al navegador) · TypeScript estricto · CSS con capas (`@layer`) y tokens generados desde el design system · Vitest · Playwright + axe-core · Lighthouse CI · ESLint · Prettier · GitHub Actions · Cloudflare Pages.

## Cómo funciona

```
design-system/    tokens.json copiado del design system: la única fuente de colores, espacios,
                  radios, sombras y escala tipográfica
src/data/         platos, secciones, alérgenos y precios (en céntimos) tipados
src/i18n/         un JSON por idioma; el tipo se deriva del español, así que una clave
                  que falte en cualquier idioma es un error de compilación
src/render/       funciones puras  (contexto → HTML)  con escapado automático: el contenido
src/pages/        rutas de Astro: cada página llama a su renderizador; sitemap.xml y robots.txt
src/layouts/      el documento común: CSS, JS, fuentes autoalojadas e iconos
src/lib/          ayudas de build: contexto de cada idioma y pipeline de imágenes
src/assets/fotos/ originales de las fotos (máximo 2400 px)
src/client/       mejora progresiva: pestañas, menú de idioma, preferencia guardada
scripts/          tokens, favicon, logo, imagen Open Graph, datos privados
tests/            unitarios (Vitest) y e2e + accesibilidad (Playwright)
```

1. `npm run tokens` convierte `design-system/tokens.json` en `src/styles/tokens.generated.css` (no se versiona). `dev`, `build` y `typecheck` lo ejecutan antes.
2. `astro build` genera una home, una carta y un menú del día por idioma, los dos legales, `404.html`, `sitemap.xml` y `robots.txt`. Las páginas `.astro` son finas: el HTML lo escriben los renderizadores de `src/render`, los mismos que prueban los tests unitarios, con metadatos, `hreflang` y JSON-LD (`Restaurant`, más `Menu` en la carta).
3. Las fotos pasan por `astro:assets`: AVIF y WebP en varios anchos, con el nombre con hash y caché de un año (`public/_headers`).
4. La API de fuentes de Astro autoaloja Montserrat y Lora (solo latín y cirílico), genera fuentes de respaldo con métricas ajustadas para que el texto no salte al cargar, y solo se precarga Montserrat latina.

Al pasar de Vite a Astro (etapa 3) se comparó el HTML de las 33 páginas antes y después: mismas URLs, mismo texto, enlaces, metadatos, clases y datos estructurados.

### Estructura de URLs

| URL                                    | Qué es                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/carta/`                              | Carta en español (idioma por defecto). **La URL de los QR de las mesas.**                                       |
| `/en/carta/`, `/gl/carta/`…            | Carta en cada uno de los otros 9 idiomas                                                                        |
| `/`, `/en/`…                           | Home en cada idioma: foto del local y las formas de contactar                                                   |
| `/menu-del-dia/`, `/en/menu-del-dia/`… | Menú del día: horario, estructura y precios; los platos de hoy se preguntan por WhatsApp hasta el CMS (etapa 4) |
| `/aviso-legal/`                        | Aviso legal (LSSI). Solo en español; borrador hasta que se apruebe                                              |
| `/privacidad/`                         | Política de privacidad (RGPD). Solo en español; borrador hasta aprobarla                                        |

La home vive en `/` y la carta es un botón de ella; la carta sigue en `/carta/` para que los QR impresos no cambien nunca. Los enlaces antiguos del tipo `/#marino` (la carta era la raíz) se reenvían a la carta con un script en línea mínimo.

## Decisiones

- **Pre-renderizado en lugar de SPA.** El original cargaba los datos con `import()` tras montar, así que el primer pintado estaba vacío y un buscador no veía ningún plato. Ahora el menú está en el HTML.
- **Una URL por idioma, no un estado.** `/en/`, `/gl/`… son páginas reales, enlazables y indexables. El selector de idioma son enlaces dentro de un `<details>`, así que funciona sin JavaScript.
- **Redirección de idioma sin dañar el SEO.** Solo desde la home en español y la carta en español, usando la elección guardada o el idioma del navegador, y nunca para rastreadores. La función que decide es la misma que ejecutan los tests.
- **Astro como herramienta de build, no como framework.** Rutas, bundling, fuentes e imágenes; el HTML sigue saliendo de funciones puras probadas. La migración no cambió ni una URL ni el contenido de ninguna página.
- **Sin dependencias externas en runtime.** Fuentes autoalojadas con subconjuntos por `unicode-range` (el navegador descarga solo latín o cirílico según el idioma; un test comprueba que todo el texto latino y ruso cabe en esos dos archivos), iconos y banderas inline.
- **Precios como enteros (céntimos)** formateados con `Intl.NumberFormat` por idioma.
- **Plantillas con escapado por defecto** (`html\`\``), sin `innerHTML` con datos sin sanear.
- **Árabe en RTL de verdad:** `dir` y `lang` en `<html>`, propiedades lógicas de CSS, sin `letter-spacing` (rompería la unión de letras) y precios aislados con `unicode-bidi`.
- **El design system manda.** Los colores salen de `tokens.json` y un test falla si aparece un color escrito a mano en el CSS. El texto va en el marrón de marca `#6E3F31` (antes `#512E24`), nunca en gris ni sobre blanco, y las bandas de marca usan ese mismo marrón. Los tonos del DS para texto pequeño (`gold-800`, `terra-700`) ya cumplen AA.

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
npm run dev            # servidor de desarrollo con todas las páginas
npm run build          # tokens + build de Astro  → dist/
npm run preview        # sirve dist/
npm test               # unitarios (481)
npm run test:e2e       # e2e + accesibilidad (112), construye antes
npm run lighthouse     # Lighthouse móvil sobre dist/ con los umbrales de lighthouserc.json
npm run lint && npm run format:check && npm run typecheck
npm run build:favicon  # regenera el icono de pestaña desde el isotipo oficial
npm run optimize:images  # regenera el logo
npm run build:og       # regenera public/og-image.jpg (1200×630) con Playwright
```

## Cómo cambiar cosas

| Para cambiar…                      | Edita                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Un precio, un plato, sus alérgenos | `src/data/menu.ts` (precios en céntimos: `1450` es 14,50€). Textos por idioma: `src/i18n/locales/<idioma>.json`              |
| El horario o el día cerrado        | No está en esta web: se gestiona en Google Business Profile y «Ver horario» abre la ficha de Google Maps                     |
| Un mensaje de WhatsApp             | `src/data/whatsapp.ts` (en español, lo lee el personal). Etiquetas de los botones por idioma: `ui.wa*` en los JSON de idioma |
| Teléfono, dirección, enlaces       | `src/render/contact.ts`                                                                                                      |
| El menú del día                    | Aún no es editable: llega con el CMS previsto en «Pendiente»                                                                 |
| Un cierre puntual (vacaciones)     | Aún no es editable: también en la etapa 4 (CMS)                                                                              |
| Colores, espacios o tipografía     | Copia el `tokens.json` nuevo del design system en `design-system/` y haz build. Nunca a mano en el CSS                       |
| Una foto (portada o favorito)      | Sustituye el original en `src/assets/fotos/` con el mismo nombre (máximo 2400 px); el build genera AVIF y WebP               |
| El icono de la pestaña             | `assets-src/brand/inkawasi-icono-light.svg` (copia del DS, sin tocar) y `npm run build:favicon`                              |

`npm test` comprueba cada cambio: un plato sin precio o sin descripción en los 10 idiomas, o un alérgeno fuera de los 14 oficiales, rompe el build.

## Datos confidenciales

Los datos del titular para las páginas legales (nombre, NIE, domicilio) **no están en git**. Viven en `private/negocio.privado.json`, ignorado por git; solo se versiona la plantilla `private/negocio.privado.example.json`. El build lo lee y nunca lo escribe (el archivo es de solo lectura). En CI, el mismo JSON se pasa como secreto `INKAWASI_PRIVATE_JSON`. Un build con `SITE_URL` se niega a publicar datos de ejemplo, y un test unitario falla si el NIE real aparece en algún archivo versionado. Los secretos técnicos (Cloudflare, Resend, Turnstile) van en variables de entorno, nunca en ese archivo.

Las páginas legales llevan siempre `noindex` y no entran en el sitemap: la ley obliga a publicar el NIE y el domicilio del titular en la web, no a que salgan en los buscadores. `LEGAL_DRAFT` en `src/data/legal.ts` solo añade el aviso de borrador (aprobadas y apagado desde el 22 de octubre de 2026).

## Despliegue

`.github/workflows/ci.yml` ejecuta formato, lint, tipos, tests unitarios, e2e y Lighthouse móvil en cada push y pull request. Lighthouse CI rompe el build si la mediana de 3 pasadas en la home, la carta, el menú del día y la carta en inglés baja de 90 en rendimiento o de 95 en accesibilidad, buenas prácticas o SEO (`lighthouserc.json`); el informe queda como artefacto del CI. Si todo pasa en `main`, el job `deploy` construye con `SITE_URL=https://inkawasi.es` (canonical, `hreflang` y `sitemap.xml`) y sube `dist/` a Cloudflare Pages con `wrangler pages deploy` (proyecto `inkawasi`). El build se hace en GitHub Actions y no en Cloudflare porque más adelante las imágenes del menú del día se generan con Playwright.

Configuración en GitHub. Los secretos van en el entorno `production` (Settings → Environments), limitado a la rama `main`, para que ningún otro job ni rama pueda leerlos:

| Nombre                  | Dónde                            | Contenido                                             |
| ----------------------- | -------------------------------- | ----------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | variable del repositorio         | ID de la cuenta de Cloudflare; sin ella no se publica |
| `CLOUDFLARE_API_TOKEN`  | secreto del entorno `production` | token con permiso Cloudflare Pages: Edit              |
| `INKAWASI_PRIVATE_JSON` | secreto del entorno `production` | el contenido de `private/negocio.privado.json`        |

Cada rama distinta de `main` se publica como vista previa en `<rama>.example-project.pages.dev` (job `preview`), construida sin `SITE_URL` y por tanto sin datos privados: los legales muestran los de la plantilla. El entorno `preview` de GitHub solo guarda `CLOUDFLARE_API_TOKEN`; sin él, el job lo avisa y no sube nada.

`public/_headers` añade `X-Robots-Tag: noindex` a las URL `*.pages.dev`, así que solo se indexa `inkawasi.es`, y caché de un año a `/_astro/*`, cuyos nombres llevan hash. `www.inkawasi.es` redirige a `https://inkawasi.es` con una regla de redirección 301 de la zona en Cloudflare.

`inkawasi.netlify.app` es un redirector 301 permanente a `https://inkawasi.es/carta/` (la web antigua era la propia carta, así que toda dirección antigua llega ahí en un salto): la carpeta `netlify-redirector/` se sube una vez a mano en Netlify (Deploys → arrastrar la carpeta). El proyecto de Netlify no se borra nunca. Vuelta atrás: en Netlify, publicar de nuevo el deploy anterior.

Build local de producción:

```bash
SITE_URL=https://inkawasi.es npm run build
```

## Pendiente

- Un CMS pequeño para el menú del día y los cierres puntuales.
- Sustituir la imagen Open Graph por una con foto del local.

## Licencia

El código tiene [licencia MIT](LICENSE). El nombre, el logotipo, las fotografías y los textos de la carta de Inkawasi pertenecen al restaurante y no están cubiertos por ella: ver [NOTICE](NOTICE).

Hecho por [babylonace](https://github.com/babylonace). AI-assisted.
