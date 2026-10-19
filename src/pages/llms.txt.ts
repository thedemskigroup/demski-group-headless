import type { APIRoute } from 'astro';
import { wpList, WP_PROD, WP_DEV, CDN_CACHE_CONTROL } from '../lib/wp';
import { SITE_ORIGIN } from '../lib/site';

// llms.txt: a plain-markdown map of the site for AI answer engines and LLM
// crawlers (https://llmstxt.org). Lists what the company does and links to
// the pages worth reading, with live case studies and recent posts.

const text = (html: string) =>
  (html || '').replace(/<[^>]*>/g, '').replace(/&#8217;/g, '’').replace(/&#038;|&amp;/g, '&').trim();

const PAGES: Array<[string, string, string]> = [
  ['Services', '/services/', 'Custom software, app, web, ecommerce, enterprise, IoT, machine learning, QA, maintenance and staff augmentation services'],
  ['App development', '/services/app-development/', 'Native and cross-platform mobile apps'],
  ['Custom software', '/services/custom-software/', 'Bespoke business software'],
  ['Web development', '/services/web/', 'Web applications and sites'],
  ['Ecommerce development', '/services/ecommerce-development/', 'Online stores and integrations'],
  ['Enterprise software', '/services/enterprise-software/', 'Systems for larger organizations'],
  ['Machine learning', '/services/machine-learning/', 'AI and ML features for business software'],
  ['Government services', '/services/gov/', 'Software for public sector clients'],
  ['CRM development', '/solutions/crm-development/', 'Custom CRM and pipeline tools'],
  ['Business process automation', '/solutions/business-process-automation/', 'Workflow and process automation'],
  ['Custom business dashboards', '/solutions/custom-business-dashboards/', 'Reporting and decision dashboards'],
  ['Technology consulting', '/solutions/technology-consulting/', 'Technology strategy for small and mid-size businesses'],
  ['Technologies', '/technologies/', 'Platforms and stacks we build on'],
  ['Methodologies', '/methodologies/', 'How projects are run'],
  ['About', '/about/', 'Company background and team'],
  ['Our clients', '/our-clients/', 'Clients we have worked with'],
  ['Contact', '/contact-us/', 'Offices in Olean NY, Cincinnati OH and Kalispell MT'],
  ['Software cost calculator', '/software-cost-calculator/', 'Estimate a custom software project'],
];

export const GET: APIRoute = async () => {
  const [results, posts] = await Promise.all([
    wpList<any>(`${WP_DEV}/wp-json/wp/v2/results?per_page=100&_fields=slug,title`).then(
      (r) => (r.length ? r : wpList<any>(`${WP_PROD}/wp-json/wp/v2/results?per_page=100&_fields=slug,title`)),
    ),
    wpList<any>(`${WP_PROD}/wp-json/wp/v2/posts?per_page=40&_fields=slug,title`),
  ]);

  const lines: string[] = [
    '# The Demski Group',
    '',
    '> US-based custom software development company with 12+ years of experience and 600+ completed projects. We design and build custom software, mobile apps, CRM systems, web applications and ecommerce platforms for businesses across the United States.',
    '',
    `Site: ${SITE_ORIGIN}. Offices in Olean, NY; Cincinnati, OH; and Kalispell, MT. Contact: contact@demskigroup.com.`,
    '',
    '## Key pages',
    '',
    ...PAGES.map(([name, path, desc]) => `- [${name}](${SITE_ORIGIN}${path}): ${desc}`),
    '',
    '## Case studies',
    '',
    `- [All results](${SITE_ORIGIN}/results/)`,
    ...results.map((r) => `- [${text(r.title?.rendered)}](${SITE_ORIGIN}/results/${r.slug}/)`),
    '',
    '## Recent blog posts',
    '',
    `- [Blog index](${SITE_ORIGIN}/blog/)`,
    `- [RSS feed](${SITE_ORIGIN}/feed.xml)`,
    ...posts.map((p) => `- [${text(p.title?.rendered)}](${SITE_ORIGIN}/blog/${p.slug}/)`),
    '',
    '## Optional',
    '',
    `- [Sitemap](${SITE_ORIGIN}/sitemap.xml)`,
    `- [Privacy policy](${SITE_ORIGIN}/privacy-policy/)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': CDN_CACHE_CONTROL },
  });
};
