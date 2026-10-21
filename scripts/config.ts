export interface BuildConfig {
  /** Public base path with leading and trailing slash. Set `BASE_PATH=/repo-name/` for GitHub Pages. */
  base: string;
  /** Absolute origin without trailing slash. Enables canonical, hreflang, sitemap. */
  siteUrl: string | undefined;
}

export function getBuildConfig(env: NodeJS.ProcessEnv = process.env): BuildConfig {
  const rawBase = env.BASE_PATH?.trim() || '/';
  const base = `/${rawBase.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
  const siteUrl = env.SITE_URL?.trim().replace(/\/+$/, '') || undefined;
  return { base, siteUrl };
}
