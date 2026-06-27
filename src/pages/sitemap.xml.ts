import type { APIRoute } from 'astro';
import { CLIENT_FALLBACKS } from '../data/clientFallbacks';

const SITE = 'https://demskigroup.com';

const STATIC_ROUTES = [
  '/',
  '/about/',
  '/services/',
  '/services/app-development/',
  '/services/custom-development/',
  '/services/custom-software/',
  '/services/ecommerce-development/',
  '/services/enterprise-software/',
  '/services/gov/',
  '/services/iot-development/',
  '/services/machine-learning/',
  '/services/maintenance/',
  '/services/pos-integration/',
  '/services/qa/',
  '/services/staff-augmentation/',
  '/services/ui-ux-design/',
  '/services/web/',
  '/solutions/business-process-automation/',
  '/solutions/crm-development/',
  '/solutions/custom-business-dashboards/',
  '/solutions/customer-self-service-portals/',
  '/solutions/data-decision-tools/',
  '/solutions/digital-transformation/',
  '/solutions/ecommerce/',
  '/solutions/employee-scheduling/',
  '/solutions/inventory-management-systems/',
  '/solutions/operations-logistics-software/',
  '/solutions/paid-media/',
  '/solutions/sales-lead-tracking-tools/',
  '/solutions/technology-consulting/',
  '/solutions/workflow-automation-solutions/',
  '/technologies/',
  '/technologies/android/',
  '/technologies/cloud/',
  '/technologies/dbms/',
  '/technologies/hybrid/',
  '/technologies/ios/',
  '/methodologies/',
  '/careers/',
  '/blog/',
  '/results/',
  '/our-clients/',
  '/contact-us/',
  '/privacy-policy/',
  '/software-cost-calculator/',
  '/calculator-form/',
  '/custom-software-development-experts/',
];

// Mirrors the hardcoded `allPosts` slugs in src/pages/results/index.astro.
// Kept in sync manually since that array lives in page frontmatter and isn't
// an importable module.
const RESULTS_SLUGS = [
  'making-property-listings-and-home-buying-simpler-with-a-well-organized-online-platform',
  'automating-aircraft-appraisal-with-a-smart-web-platform',
  'combining-campaigns-products-and-communities-in-one-platform',
  'managing-the-complexities-of-vehicle-repossession-with-a-mobile-first-application',
  'making-insect-identification-faster-and-easier-with-ai',
  'transforming-collectible-grading-into-a-more-automated-and-efficient-process',
  'how-to-tame-complex-operations-with-a-custom-erp-solution',
  'building-safer-workplaces-with-smarter-safety-training-and-compliance-tools',
  'bringing-league-operations-under-one-roof',
  'modernizing-home-appraisals-with-a-mobile-workflow-system',
  'helping-a-startup-launch-a-scalable-saas-platform',
  'streamlining-field-operations-with-a-custom-mobile-app',
];

function xmlEscape(url: string) {
  return url.replace(/&/g, '&amp;');
}

function urlTag(loc: string) {
  return `  <url><loc>${xmlEscape(loc)}</loc></url>`;
}

export const GET: APIRoute = async () => {
  const urls = new Set<string>();

  for (const route of STATIC_ROUTES) urls.add(SITE + route);
  for (const slug of RESULTS_SLUGS) urls.add(`${SITE}/results/${slug}/`);
  for (const slug of Object.keys(CLIENT_FALLBACKS)) urls.add(`${SITE}/our-clients/${slug}/`);

  try {
    const res = await fetch('https://demskigroup.com/wp-json/wp/v2/posts?per_page=100&_fields=slug', {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const posts = await res.json();
      if (Array.isArray(posts)) {
        for (const post of posts) {
          if (post?.slug) urls.add(`${SITE}/blog/${post.slug}/`);
        }
      }
    }
  } catch (e) {
    // WordPress unreachable — sitemap still returns all static + known dynamic routes.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(urls).map(urlTag).join('\n')}\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
