import type { APIRoute } from 'astro';
import { base, siteUrl } from '../lib/build';
import { robotsTxt } from '../render/sitemap';

export const GET: APIRoute = () => new Response(robotsTxt({ base, siteUrl }));
