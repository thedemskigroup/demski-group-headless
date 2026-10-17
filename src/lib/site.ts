/**
 * Public identity of the site, independent of which host actually served
 * the request.
 *
 * The app runs on AWS Amplify (main.<id>.amplifyapp.com) but is meant to be
 * reached as demskigroup.com, either directly (custom domain) or through a
 * Cloudflare Worker that proxies selected paths from demskigroup.com to the
 * Amplify URL. In the proxied case the request the app sees carries the
 * Amplify hostname, so anything that derives a public URL or an indexing
 * decision from the request host would be wrong. Use these helpers instead.
 */

/** Canonical origin every public URL should be expressed against. */
export const SITE_ORIGIN = 'https://demskigroup.com';

/** Hostnames that mean "this request is really for the production site". */
const PUBLIC_HOSTS = new Set(['demskigroup.com', 'www.demskigroup.com']);

/**
 * The hostname the visitor typed. A reverse proxy in front of the app sets
 * `X-Forwarded-Host` to the original host; otherwise it is the request host.
 */
export function visitorHost(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-host');
  const host = (forwarded || new URL(request.url).hostname).split(',')[0].trim();
  // Strip any :port so comparisons are on the bare hostname.
  return host.replace(/:\d+$/, '').toLowerCase();
}

/**
 * True when the visitor is on the real production domain, either directly
 * or via the proxy. False for the bare Amplify URL and any other host.
 */
export function isPublicHost(request: Request): boolean {
  return PUBLIC_HOSTS.has(visitorHost(request));
}

/**
 * Canonical absolute URL for a path (or full URL). The host is always
 * SITE_ORIGIN; only the path and query of the input are kept.
 */
export function canonicalFor(pathOrUrl: string): string {
  const u = new URL(pathOrUrl, SITE_ORIGIN);
  return `${SITE_ORIGIN}${u.pathname}${u.search}`.replace(/\/$/, '') || SITE_ORIGIN;
}
