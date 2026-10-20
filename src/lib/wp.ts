// Shared WordPress REST fetch helper for SSR pages.
//
// Every SSR page used to call fetch() directly and wait on WordPress before
// it could send a byte of HTML. This helper adds two things:
//
//   1. A short in-memory cache (per server process) keyed by URL, so the
//      sidebar data that every blog/results page needs (categories, tags,
//      recent posts) is fetched from WordPress once every few minutes, not
//      once per request. In-flight requests are de-duplicated too, so a
//      burst of concurrent renders triggers a single upstream call.
//   2. A uniform timeout + never-throws contract. Callers get back
//      { ok, status, data, total, totalPages } and decide how to degrade.
//
// Pair this with `_fields=` on the WordPress URL: the biggest wins come from
// not asking WordPress to serialize full post content, ACF blobs and every
// embedded object when a card only needs a title, slug, date and thumbnail.

export interface WpResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  /** From the X-WP-Total header, 0 if absent. */
  total: number;
  /** From the X-WP-TotalPages header, 1 if absent. */
  totalPages: number;
}

export interface WpFetchOptions {
  /** Abort the upstream request after this many ms. Default 8000. */
  timeoutMs?: number;
  /** How long a successful response is reused. Default 5 minutes. */
  ttlMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_TTL_MS = 5 * 60 * 1000;
// Failed/404 responses are remembered briefly so a dead endpoint is not
// re-hit on every render, but recovers quickly once it is back.
const FAILURE_TTL_MS = 60 * 1000;

type CacheEntry = { expires: number; value: WpResult };

// Stored on globalThis so the cache survives Vite/Astro module re-evaluation
// in dev and is shared by every page in the same server process.
const cache: Map<string, CacheEntry> = ((globalThis as any).__wpFetchCache ??= new Map());
const inflight: Map<string, Promise<WpResult>> = ((globalThis as any).__wpFetchInflight ??= new Map());

const FAILED: WpResult = { ok: false, status: 0, data: null, total: 0, totalPages: 1 };

export async function wpFetch<T = any>(url: string, opts: WpFetchOptions = {}): Promise<WpResult<T>> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as WpResult<T>;

  const pending = inflight.get(url);
  if (pending) return pending as Promise<WpResult<T>>;

  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const run = (async (): Promise<WpResult<T>> => {
    let result: WpResult<T>;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      let data: T | null = null;
      if (res.ok) {
        try { data = (await res.json()) as T; } catch { data = null; }
      }
      result = {
        ok: res.ok && data !== null,
        status: res.status,
        data,
        total: Number(res.headers.get('X-WP-Total') || 0),
        totalPages: Number(res.headers.get('X-WP-TotalPages') || 1) || 1,
      };
    } catch (e) {
      console.warn('[wp] fetch failed:', url, (e as Error)?.message);
      result = { ...FAILED };
    }
    cache.set(url, { expires: Date.now() + (result.ok ? ttlMs : FAILURE_TTL_MS), value: result });
    return result;
  })();

  inflight.set(url, run);
  try {
    return await run;
  } finally {
    inflight.delete(url);
  }
}

/** Convenience: returns the JSON array from a list endpoint, or [] on any failure. */
export async function wpList<T = any>(url: string, opts?: WpFetchOptions): Promise<T[]> {
  const r = await wpFetch<T[]>(url, opts);
  return r.ok && Array.isArray(r.data) ? r.data : [];
}

/** Convenience: first item of a list endpoint (e.g. `?slug=`), or null. */
export async function wpFirst<T = any>(url: string, opts?: WpFetchOptions): Promise<T | null> {
  const list = await wpList<T>(url, opts);
  return list[0] ?? null;
}

// Origin of the WordPress install every REST call goes to. demskigroup.com
// stays on WP Engine, and during the traffic split a Cloudflare Worker always
// routes /wp-json and /wp-content there, so this keeps working while pages
// move to this app. Set the WP_ORIGIN env var to point at another install.
// Never point this at the WP Engine development environment: it is a separate
// WordPress, not a mirror of production.
export const WP_ORIGIN = (
  (typeof process !== 'undefined' && process.env?.WP_ORIGIN) ||
  import.meta.env.WP_ORIGIN ||
  'https://demskigroup.com'
).replace(/\/+$/, '');

// CDN cache policy for SSR marketing pages. Content changes rarely, so
// CloudFront may serve a page for an hour and keep serving the stale copy
// for a day while it refreshes in the background. Visitors almost never
// wait on a cold render.
export const CDN_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

// Field lists for the common card shapes. Keeping these in one place makes
// it obvious what the templates rely on.
//
// Blog post cards: title, date, slug, excerpt, featured image, first term.
export const POST_CARD_FIELDS = '_embed=wp:featuredmedia,wp:term&_fields=id,slug,date,title,excerpt,_links.wp:featuredmedia,_links.wp:term';
// Taxonomy sidebars.
export const TERM_FIELDS = '_fields=id,name,slug,count';

/**
 * Every published slug for a WordPress post type, following pagination.
 * Tries each host in order; returns [] if none respond. Pages are served
 * through wpFetch, so repeat calls within the TTL cost nothing.
 */
export async function wpAllSlugs(hosts: string[], type: string, ttlMs = 60 * 60 * 1000): Promise<string[]> {
  for (const host of hosts) {
    const collected: string[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const r = await wpFetch<any[]>(
        `${host}/wp-json/wp/v2/${type}?per_page=100&page=${page}&_fields=slug&orderby=date&order=desc`,
        { ttlMs },
      );
      if (!r.ok || !Array.isArray(r.data)) break;
      totalPages = r.totalPages || 1;
      for (const item of r.data) if (item?.slug) collected.push(item.slug);
      page++;
    } while (page <= totalPages && page <= 20);
    if (collected.length) return collected;
  }
  return [];
}
