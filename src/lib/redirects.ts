/**
 * Legacy URL redirects: every URL the WordPress site publishes that has a
 * different (or no) home on this site. Consulted by the middleware only when
 * a request would otherwise 404, so real routes are never affected.
 *
 * Source of truth for the WordPress URL set: its Yoast sitemaps
 * (post-, page-, results-, category-, post_tag-, author-sitemap.xml),
 * compared against this site's sitemap on 2026-10-19.
 */
import { wpAllSlugs, WP_PROD } from './wp';

/** Exact paths (leading and trailing slash) → destination. */
const EXACT: Record<string, string> = {
  '/about-us/': '/about/',
  '/android-development/': '/technologies/android/',
  '/ios-development/': '/technologies/ios/',
  '/wordpress-development/': '/services/web/',
  '/web-application-development/': '/web-application-development-experts/',
  '/custom-ai-software-development/': '/services/machine-learning/',
  '/ai-for-business-landing/': '/services/machine-learning/',
  '/custom-crm-development/': '/solutions/crm-development/',
  '/shopify-development/': '/solutions/ecommerce/',
  '/shopify-development-company/': '/solutions/ecommerce/',
  '/custom-shopify-development-experts/': '/solutions/ecommerce/',
  '/custom-software-development-services/': '/custom-software-development-experts/',
  '/custom-software-development-experts-2/': '/custom-software-development-experts/',
  '/custom-software-development-experts-2-2/': '/custom-software-development-experts/',
  '/custom-software-development-experts-kp/': '/custom-software-development-experts/',
  '/custom-mobile-app-development-experts/': '/services/app-development/',
  '/custom-mobile-app-development-experts-2/': '/services/app-development/',
  '/custom-mobile-app-development-services/': '/services/app-development/',
  '/stop-charting-late-finally-launch-your-side-project/': '/services/app-development/',
  '/custom-business-dashboard-landing/': '/solutions/custom-business-dashboards/',
  '/replace-spreadsheets-with-custom-software/': '/solutions/custom-business-dashboards/',
  '/services/consulting/': '/solutions/technology-consulting/',
  '/roi-calculator/': '/software-cost-calculator/',
  '/business-software-cost-calculator/': '/software-cost-calculator/',
  '/startup-free-design-mockup/': '/services/ui-ux-design/',
  '/business-owners/': '/services/custom-software/',
  '/medical-professionals/': '/services/custom-software/',
  '/products/': '/services/',
  '/solutions/': '/services/',
  '/industries/': '/services/',
  '/referral-program/': '/contact-us/',
  '/thank-you/': '/contact-us/',
  // Industry pages: the few with a direct equivalent; the rest fall to the
  // /industries/ prefix rule below.
  '/industries/custom-government-software-development/': '/services/gov/',
  '/industries/custom-roofing-crm/': '/solutions/crm-development/',
  '/industries/retail-ecommerce/': '/solutions/ecommerce/',
  '/industries/saas/': '/services/custom-software/',
  // Technology tag pages that map onto a real technology page here.
  '/technology/android/': '/technologies/android/',
  '/technology/kotlin/': '/technologies/android/',
  '/technology/ios/': '/technologies/ios/',
  '/technology/swift/': '/technologies/ios/',
  '/technology/apple/': '/technologies/ios/',
  '/technology/aws/': '/technologies/cloud/',
  '/technology/azure/': '/technologies/cloud/',
  '/technology/heroku/': '/technologies/cloud/',
  '/technology/serverless/': '/technologies/cloud/',
  '/technology/mysql/': '/technologies/dbms/',
  '/technology/mongo/': '/technologies/dbms/',
  '/technology/flutter/': '/technologies/hybrid/',
  '/technology/reactnative/': '/technologies/hybrid/',
  '/technology/cross-platform-development/': '/technologies/hybrid/',
  '/technology/native/': '/technologies/hybrid/',
  '/technology/crm/': '/solutions/crm-development/',
  '/technology/ecommerce/': '/solutions/ecommerce/',
  '/technology/shopify/': '/solutions/ecommerce/',
  '/technology/woocommerce/': '/solutions/ecommerce/',
  '/technology/machine-learning/': '/services/machine-learning/',
  '/technology/ai/': '/services/machine-learning/',
  '/technology/staff-augmentation/': '/services/staff-augmentation/',
  '/technology/government-software/': '/services/gov/',
  '/technology/custom-dashboards/': '/solutions/custom-business-dashboards/',
  '/technology/business-dashboard/': '/solutions/custom-business-dashboards/',
  '/technology/inventory-management/': '/solutions/inventory-management-systems/',
  '/technology/customer-portal/': '/solutions/customer-self-service-portals/',
  '/technology/self-service/': '/solutions/customer-self-service-portals/',
  '/technology/data-decision-tools/': '/solutions/data-decision-tools/',
  '/technology/workflow/': '/solutions/workflow-automation-solutions/',
  '/technology/automation/': '/solutions/business-process-automation/',
  '/technology/software-maintenance/': '/services/maintenance/',
  '/technology/enterprise-software/': '/services/enterprise-software/',
  '/technology/enterprise-development/': '/services/enterprise-software/',
  '/technology/web-development/': '/services/web/',
  '/technology/wordpress/': '/services/web/',
  '/technology/app-development/': '/services/app-development/',
  '/technology/agile/': '/methodologies/',
  '/technology/project-management/': '/methodologies/',
  '/technology/digital-strategy/': '/solutions/digital-transformation/',
  '/feed/': '/feed.xml',
  '/feed/atom/': '/feed.xml',
  '/rss/': '/feed.xml',
};

/** Prefix rules, checked after EXACT. First match wins. */
const PREFIX: Array<[string, string]> = [
  ['/technology/', '/technologies/'],
  ['/industries/', '/services/'],
  ['/author/', '/blog/'],
];

/** Intentionally gone: no sensible destination, keep the 404. */
const GONE = new Set(['/cart/', '/checkout/', '/test-templates/']);

function normalize(pathname: string): string {
  let p = pathname.toLowerCase();
  if (!p.endsWith('/')) p += '/';
  return p;
}

/**
 * Destination for a legacy WordPress path, or null if there is none.
 * Blog posts lived at the site root on WordPress (/<slug>/) and live under
 * /blog/ here, so a single-segment path is checked against the live list of
 * post slugs (cached for an hour).
 */
export async function legacyRedirect(pathname: string): Promise<string | null> {
  const p = normalize(pathname);
  if (GONE.has(p)) return null;
  if (EXACT[p]) return EXACT[p];
  for (const [prefix, dest] of PREFIX) if (p.startsWith(prefix)) return dest;

  const m = p.match(/^\/([a-z0-9][a-z0-9-]*)\/$/);
  if (m) {
    const slugs = await wpAllSlugs([WP_PROD], 'posts');
    if (slugs.includes(m[1])) return `/blog/${m[1]}/`;
  }
  return null;
}
