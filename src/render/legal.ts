import { LEGAL_DRAFT, LEGAL_UPDATED, type LegalId, type Titular } from '../data/legal';
import { html, raw, type SafeHtml } from '../lib/html';
import { CONTACT } from './contact';
import { createPage, type RenderContext } from './context';
import { footer } from './footer';
import { spriteSheet } from './icons';
import type { RenderedPage } from './page';

interface LegalInput {
  titular: Titular;
  /** Public address of the site, when the build has one. */
  siteUrl: string | undefined;
}

const TITLES: Record<LegalId, string> = {
  'aviso-legal': 'Aviso legal',
  privacidad: 'Política de privacidad',
};

/** "21 de octubre de 2026" */
function longDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function avisoLegal({ titular, siteUrl }: LegalInput): SafeHtml {
  return html`<h2>1. Datos identificativos</h2>
    <p>
      En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la
      Información y de Comercio Electrónico (LSSI), se informa de los datos del titular de este
      sitio web:
    </p>
    <dl>
      <dt>Titular</dt>
      <dd>${titular.nombre}</dd>
      <dt>NIE</dt>
      <dd>${titular.nie}</dd>
      <dt>Domicilio</dt>
      <dd>${titular.domicilio}</dd>
      <dt>Nombre comercial</dt>
      <dd>${CONTACT.name} · Cocina Tradicional Peruana</dd>
      <dt>Actividad</dt>
      <dd>Restauración (cocina tradicional peruana)</dd>
      <dt>Correo electrónico</dt>
      <dd><a href="mailto:${CONTACT.email}">${CONTACT.email}</a></dd>
      <dt>Teléfono y WhatsApp</dt>
      <dd>${CONTACT.phoneDisplay}</dd>
      ${
        siteUrl &&
        html`<dt>Sitio web</dt>
          <dd>${siteUrl}</dd>`
      }
    </dl>

    <h2>2. Objeto y uso del sitio</h2>
    <p>
      Este sitio web informa sobre el restaurante: la carta, los alérgenos de cada plato, el horario
      y las formas de contacto. Al usarlo te comprometes a hacerlo de forma lícita y sin dañar su
      funcionamiento.
    </p>

    <h2>3. Información de la carta</h2>
    <p>
      Los platos, precios y alérgenos publicados son los vigentes en el momento de su revisión y
      pueden cambiar. La información de alérgenos es orientativa: si tienes una alergia o
      intolerancia, consulta siempre con nuestro personal antes de pedir.
    </p>

    <h2>4. Propiedad intelectual e industrial</h2>
    <p>
      El nombre, el logotipo, las fotografías y los textos de este sitio pertenecen a su titular o
      se usan con autorización. No se pueden reproducir, distribuir ni transformar sin permiso
      previo por escrito, salvo para compartir un enlace a la web.
    </p>

    <h2>5. Enlaces a terceros</h2>
    <p>
      El sitio enlaza a servicios de terceros (Google Maps, WhatsApp, Instagram, Facebook, Just Eat
      y TripAdvisor). Cada uno se rige por sus propias condiciones y política de privacidad, y el
      titular no es responsable de su contenido ni de su funcionamiento.
    </p>

    <h2>6. Responsabilidad</h2>
    <p>
      El titular procura que la información sea exacta y que el sitio esté disponible, pero no
      garantiza la ausencia de errores ni de interrupciones, y podrá modificar o retirar contenidos
      en cualquier momento.
    </p>

    <h2>7. Legislación aplicable</h2>
    <p>
      Este aviso se rige por la legislación española. Si eres consumidor, puedes acudir a los
      juzgados y tribunales de tu domicilio.
    </p>`;
}

function privacidad({ titular, siteUrl }: LegalInput): SafeHtml {
  return html`<h2>1. Responsable del tratamiento</h2>
    <dl>
      <dt>Responsable</dt>
      <dd>${titular.nombre}</dd>
      <dt>NIE</dt>
      <dd>${titular.nie}</dd>
      <dt>Domicilio</dt>
      <dd>${titular.domicilio}</dd>
      <dt>Contacto</dt>
      <dd><a href="mailto:${CONTACT.email}">${CONTACT.email}</a></dd>
    </dl>

    <h2>2. Qué datos tratamos</h2>
    <ul>
      <li>
        <strong>Al navegar por la web.</strong> No hay formularios ni cuentas de usuario. Como en
        cualquier servidor, el servicio de alojamiento recibe tu dirección IP y datos técnicos de la
        petición (navegador, fecha y página) en sus registros.
      </li>
      <li>
        <strong>Si nos escribes o llamas</strong> por WhatsApp, teléfono o correo para reservar,
        hacer un pedido o consultar algo: tu número o correo, tu nombre y lo que nos cuentes.
      </li>
    </ul>

    <h2>3. Para qué y con qué base legal</h2>
    <ul>
      <li>
        Atender tus consultas, reservas y pedidos, y avisarte de cambios. Base legal: la aplicación
        de medidas precontractuales o la ejecución del servicio que nos pides (artículo 6.1.b del
        RGPD).
      </li>
      <li>
        Mantener la seguridad y el buen funcionamiento del sitio. Base legal: interés legítimo
        (artículo 6.1.f del RGPD).
      </li>
    </ul>
    <p>No usamos tus datos para enviarte publicidad ni los cedemos para ese fin.</p>

    <h2>4. Cookies y almacenamiento en tu dispositivo</h2>
    <p>
      Esta web <strong>no usa cookies</strong> ni herramientas de seguimiento, y no carga recursos
      de terceros (fuentes, iconos, mapas o publicaciones incrustadas). Lo único que guarda en tu
      navegador es el idioma que eliges en la carta, para mostrártela en él la próxima vez; no sale
      de tu dispositivo ni te identifica.
    </p>
    <p>
      Hoy no usamos analítica. Si más adelante añadimos una medición de visitas sin cookies y sin
      identificar personas, lo indicaremos aquí.
    </p>

    <h2>5. Publicaciones de Instagram</h2>
    <p>
      La página de inicio muestra nuestras últimas publicaciones de Instagram (@inkawasi.ferrol).
      Son publicaciones propias. La web las copia en su propio servidor cuando se actualiza, una vez
      al día, y guarda solo las seis últimas: al ver la página, tu navegador no contacta con
      Instagram ni con Meta. Si pulsas una publicación, se abre Instagram, que trata tus datos según
      su propia política de privacidad.
    </p>

    <h2>6. Quién más puede recibir datos</h2>
    <ul>
      <li>
        <strong>Alojamiento web y correo:</strong> Cloudflare, que aloja esta web, gestiona su
        dominio y reenvía el correo de @inkawasi.es; Netlify, que entrega la web a los visitantes y
        redirige la dirección antigua inkawasi.netlify.app; y Google (Gmail), donde recibimos ese
        correo. Los tres actúan como encargados del tratamiento.
      </li>
      <li>
        <strong>WhatsApp (Meta):</strong> si nos escribes por WhatsApp, esa plataforma trata tus
        datos según sus propias condiciones.
      </li>
      <li>
        <strong>Just Eat:</strong> si haces un pedido allí, esa plataforma es responsable de tus
        datos.
      </li>
    </ul>
    <p>
      Algunos de estos proveedores están en Estados Unidos. Esa transferencia internacional se
      ampara en las garantías que ofrecen (cláusulas contractuales tipo o el Marco de Privacidad
      UE-EE. UU.).
    </p>

    <h2>7. Cuánto tiempo conservamos los datos</h2>
    <p>
      Las conversaciones y los datos de una reserva o pedido se conservan el tiempo necesario para
      atenderlos y, después, durante los plazos legales en los que pudieran derivarse
      responsabilidades. Los registros del servidor los gestiona el proveedor de alojamiento.
    </p>

    <h2>8. Tus derechos</h2>
    <p>
      Puedes pedir el acceso, la rectificación, la supresión, la oposición, la limitación y la
      portabilidad de tus datos escribiendo a
      <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>. Si crees que no hemos tratado bien tus
      datos, puedes reclamar ante la Agencia Española de Protección de Datos (<a
        href="https://www.aepd.es"
        rel="noopener"
        >www.aepd.es</a
      >).
    </p>
    ${siteUrl && html`<p>Esta política se aplica a ${siteUrl}.</p>`}`;
}

const BODY: Record<LegalId, (input: LegalInput) => SafeHtml> = {
  'aviso-legal': avisoLegal,
  privacidad,
};

/**
 * Aviso legal and privacy policy. Spanish only: they are required by Spanish law, and the
 * holder's details come from the private data file, so the pages are always noindex: the NIE
 * and address belong on the site, not in search results. While `LEGAL_DRAFT` is true the page
 * also says it is a draft.
 */
export function renderLegalPage(
  ctx: RenderContext,
  id: LegalId,
  titular: Titular,
  draft: boolean = LEGAL_DRAFT,
): RenderedPage {
  const page = createPage({ ...ctx, lang: 'es' });
  const title = `${TITLES[id]} · ${CONTACT.name}`;

  const head = html`<title>${title}</title>
    <meta name="description" content="${TITLES[id]} de ${CONTACT.name}, Ferrol." />
    ${raw('<meta name="robots" content="noindex" />')}`;

  const body = html`${spriteSheet()}
    <a class="skip-link" href="#content">${page.t.skipLink}</a>
    <header class="legal-bar">
      <div class="container">
        <a href="${ctx.base}">
          <img src="${ctx.base}assets/logo.webp" width="162" height="50" alt="${CONTACT.name}" />
        </a>
      </div>
    </header>
    <main id="content" class="legal container">
      ${
        draft &&
        html`<p class="legal__draft" role="note">
          Borrador pendiente de revisión. Este texto todavía no es definitivo.
        </p>`
      }
      <h1 class="legal__title">${TITLES[id]}</h1>
      <p class="legal__updated">Última actualización: ${longDate(LEGAL_UPDATED)}</p>
      ${BODY[id]({ titular, siteUrl: ctx.siteUrl })}
    </main>
    ${footer(page)}`;

  return { lang: 'es', dir: 'ltr', head: head.toString(), body: body.toString() };
}
