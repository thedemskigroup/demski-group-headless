import type { APIRoute } from 'astro';
import { wpList, WP_ORIGIN, CDN_CACHE_CONTROL } from '../lib/wp';
import { SITE_ORIGIN } from '../lib/site';

// RSS 2.0 feed of the latest blog posts. WordPress served one at /feed/;
// aggregators and several AI crawlers still read feeds, so keep parity.

const esc = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = (html: string) =>
  (html || '').replace(/<[^>]*>/g, '').replace(/\[&hellip;\]/g, '…').replace(/&#8217;/g, '’').replace(/&amp;/g, '&').trim();

export const GET: APIRoute = async () => {
  const posts = await wpList<any>(
    `${WP_ORIGIN}/wp-json/wp/v2/posts?per_page=20&_fields=slug,date_gmt,title,excerpt,content`,
  );

  const items = posts
    .map((p) => {
      const url = `${SITE_ORIGIN}/blog/${p.slug}/`;
      const pub = new Date(`${p.date_gmt}Z`).toUTCString();
      return `    <item>
      <title>${esc(text(p.title?.rendered))}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(text(p.excerpt?.rendered))}</description>
      <content:encoded><![CDATA[${(p.content?.rendered || '').replace(/\]\]>/g, ']]&gt;')}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>The Demski Group Blog</title>
    <link>${SITE_ORIGIN}/blog/</link>
    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Custom software, mobile apps, CRM and web development insights from The Demski Group.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': CDN_CACHE_CONTROL },
  });
};
