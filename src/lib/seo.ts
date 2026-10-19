/**
 * SEO data carried over from WordPress / Yoast.
 *
 * Every post's REST response includes `yoast_head_json`: the title and
 * description written in Yoast, Open Graph image, publish/modify times and
 * the full schema.org graph (Article, BreadcrumbList, WebPage, WebSite,
 * Person, Organization). We reuse it so posts keep the exact SEO data they
 * had on WordPress, with URLs rewritten to where things live on this site.
 */
import { SITE_ORIGIN } from './site';

export interface PostSeo {
  title?: string;
  description?: string;
  ogImage?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd: object[];
}

/** Rewrite a WordPress URL to this site's URL space. */
function rewriteUrl(url: string, slug: string): string {
  const wp = SITE_ORIGIN;
  return url
    // The post itself: root on WordPress, /blog/ here.
    .replace(new RegExp(`^${wp}/${slug}/(#.*)?$`), (_m, hash) => `${wp}/blog/${slug}/${hash || ''}`)
    // Author archives do not exist here.
    .replace(new RegExp(`^${wp}/author/[^/]+/?$`), `${wp}/about/`)
    // WordPress search → blog search.
    .replace(`${wp}/?s={search_term_string}`, `${wp}/blog/?s={search_term_string}`);
}

function rewriteDeep(value: any, slug: string): any {
  if (typeof value === 'string') return value.startsWith(SITE_ORIGIN) ? rewriteUrl(value, slug) : value;
  if (Array.isArray(value)) return value.map((v) => rewriteDeep(v, slug));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteDeep(v, slug);
    return out;
  }
  return value;
}

/**
 * Build the SEO props for a blog post from its Yoast head data. Falls back
 * to nothing (callers keep their own defaults) when Yoast data is absent.
 */
export function postSeo(post: any): PostSeo {
  const y = post?.yoast_head_json;
  const slug: string = post?.slug || '';
  if (!y) return { jsonLd: [] };

  const jsonLd: object[] = [];
  if (y.schema?.['@graph']) {
    const graph = (y.schema['@graph'] as any[])
      // The layout already emits Organization with the same @id, so the
      // Article's publisher reference still resolves.
      .filter((node) => node?.['@type'] !== 'Organization')
      .map((node) => rewriteDeep(node, slug));
    // Breadcrumb: WordPress had Home › Post. Here the post sits under Blog.
    for (const node of graph) {
      if (node['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
        const items = node.itemListElement as any[];
        if (items.length === 2) {
          node.itemListElement = [
            items[0],
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/blog/` },
            { ...items[1], position: 3 },
          ];
        }
      }
    }
    jsonLd.push({ '@context': 'https://schema.org', '@graph': graph });
  }

  return {
    title: y.title || undefined,
    description: y.description || y.og_description || undefined,
    ogImage: y.og_image?.[0]?.url || undefined,
    publishedTime: y.article_published_time || post?.date_gmt && `${post.date_gmt}Z` || undefined,
    modifiedTime: y.article_modified_time || undefined,
    jsonLd,
  };
}
