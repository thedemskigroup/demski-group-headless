# CLAUDE.md

Marketing site for The Demski Group: an Astro 6 site that renders on the server and loads its blog and case studies from WordPress ("headless WordPress"). It is plain `.astro` files with no UI framework (no React or Vue), no Tailwind and no content collections.

## Commands

- `npm run dev`: dev server at http://localhost:4321 (also available as `astro-dev` in `.claude/launch.json`)
- `npm run build`: runs `astro build`, then `postbuild` runs `scripts/prepare-amplify.mjs`, which packs `dist/` into `.amplify-hosting/` for AWS Amplify
- `npm run preview`: serve the built site
- `node qa-links.cjs`: Playwright check that crawls a fixed list of pages against `http://127.0.0.1:4321` (start the dev server first)
- `node scripts/scan-supply-chain.cjs`: scans for supply-chain malware. CI runs it on every push and PR (`.github/workflows/malware-scan.yml`)

Node >= 22.12. There is no test suite and no linter.

## Deployment (the README is out of date)

- `astro.config.mjs` uses `output: 'server'` with the `@astrojs/node` adapter in standalone mode. Every page renders on each request.
- The site is hosted on **AWS Amplify** (`amplify.yml`), not Vercel as the README says.
- Sessions use an in-memory store on purpose, because Amplify's compute file system is read-only.
- Redirects live in `astro.config.mjs` under `redirects`.
- `src/middleware.ts` adds security headers to every response. On `*.amplifyapp.com` hosts it also adds `X-Robots-Tag: noindex`. It deliberately sets no CSP.

## Where pages live

Routing is file-based under `src/pages/`. Each URL is a folder containing `index.astro`, so links end with a trailing slash (for example `/services/web/`).

- `index.astro` (home), `about.astro`, `404.astro`
- `services/*`, `solutions/*`, `technologies/*`: static landing pages, each a large self-contained file
- `custom-software-development-experts/`, `web-application-development-experts/`: ad landing pages
- `contact-us/`, `calculator-form/`, `software-cost-calculator/`, `careers/`, `methodologies/`, `privacy-policy/`
- Dynamic routes (data from WordPress):
  - `blog/index.astro`, `blog/[slug].astro`: posts
  - `category/[slug].astro`, `tag/[slug].astro`: post archives
  - `results/index.astro`, `results/[slug].astro`: the `results` post type
  - `our-clients/index.astro`, `our-clients/[slug].astro`: case studies (the `our-clients` post type)
- `sitemap.xml.ts`: API route. When you add a static page, also add it to `STATIC_ROUTES` here.

## Shared layout and components

There is very little shared code. Most pages repeat their own markup, data and CSS.

- **`src/layouts/Layout.astro`** wraps every page. It contains:
  - Props: `title`, `description`, `pageClass` (a class added to `<body>`, used to scope page CSS), `ogImage`, `canonical`
  - Everything in `<head>`: SEO/OG tags, Organization JSON-LD, the Outfit font, Font Awesome 6.5 (from cdnjs), Google Tag Manager `GTM-W476LNT`
  - The attribution script: it stores `utm_*`, `gclid`, `fbclid` and similar values in cookies and exposes `window.__dgTracking()`. Every lead form reads its tracking values from this one function, so extend it here rather than in each form.
  - The sticky header (top bar, nav with dropdowns, mobile menu), the footer, and the lazy-loaded chatbot (`widget.js` from the Amplify chatbot app)
  - A default `<slot />` for the page body and a `<slot name="head" />` for extra head tags
- **`src/components/ContactSection.astro`** is the only shared component: a contact form with a testimonial carousel. Its testimonials are hard-coded inside the component. Some pages pass `testimonials={...}`, but the component never reads that prop.
- **`src/data/clientFallbacks.ts`** holds static case-study data (`CLIENT_FALLBACKS`) and `normalizeClient()`, which merges live WordPress data with that fallback. It is used by both `our-clients` routes and the sitemap.

Lead forms (ContactSection, `contact-us`, `calculator-form`) send JSON to `https://main.d13spywfxx47ns.amplifyapp.com/api/send-lead`. The endpoint is passed in through `<script is:inline define:vars={{ leadEndpoint }}>` and appears in three places, so change all of them together.

## How WordPress content is loaded

All content comes from one WordPress install, set by `WP_ORIGIN` in `src/lib/wp.ts`. It defaults to `https://demskigroup.com` and can be overridden with the `WP_ORIGIN` env var. demskigroup.com stays on WP Engine, and during the traffic split a Cloudflare Worker always routes `/wp-json` and `/wp-content` there.

Never load anything from the WP Engine development environment (`demskigrdev.wpenginepowered.com`). It is a separate WordPress, not a mirror: it only matches production right after dev is pushed to live. The only remaining mentions are link-cleanup helpers that strip the host from links (`services/index.astro`, `solutions/technology-consulting/index.astro`).

- Endpoints: `${WP_ORIGIN}/wp-json/wp/v2/...` with `posts`, `categories`, `tags`, `results`, `our-clients`, `team_member`. There is no `reviews` route; testimonials are hard-coded in the pages. Custom fields are read from `item.acf.*`; the featured image is `_embedded['wp:featuredmedia'][0].source_url`.
- Use the helpers in `src/lib/wp.ts`: `wpFetch` (8 s default timeout, never throws, in-memory cache with in-flight de-duplication), `wpList` (array or `[]`), `wpFirst` (first item or `null`) and `wpAllSlugs`. Pass `_fields=` (see `POST_CARD_FIELDS`, `TERM_FIELDS`) so WordPress doesn't serialize full content when a card only needs a title and image.

```astro
import { wpList, POST_CARD_FIELDS, WP_ORIGIN } from '../lib/wp';
const posts = await wpList(`${WP_ORIGIN}/wp-json/wp/v2/posts?per_page=6&${POST_CARD_FIELDS}`);
```

- A page must still render when WordPress is down, because the API sometimes returns 502s. Pages fall back to static data when a fetch fails. Examples: `FALLBACK_RESULTS` in `index.astro`, the pinned list in `results/index.astro`, and `CLIENT_FALLBACKS` for case studies.
- `our-clients/[slug].astro` and `sitemap.xml.ts` still call `fetch` directly (10 s and 8 s timeouts, wrapped in try/catch). `our-clients/[slug].astro` keeps the last good answer in a module-level cache on `globalThis.__csApiCache`. Some case studies have custom per-slug layouts that only appear when the live data loads.
- Detail pages set `Astro.response.status = 404` when nothing is found. SSR pages set `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` (`CDN_CACHE_CONTROL` in `src/lib/wp.ts`).
- WordPress text is HTML-encoded, so pages decode entities and strip tags with small local helpers (for example `cleanT`) before display. Absolute WordPress links are rewritten to relative paths.
- Images from the old WordPress site are mirrored under `public/wp-content/uploads/...` and referenced by root-relative paths (`/wp-content/uploads/...`). Never hard-code a WordPress host in an image URL.

## Styling conventions

- Plain CSS written inside each `.astro` file. There are no global stylesheets, no CSS variables, no preprocessor and no Tailwind.
- Pages use `<style>` (scoped), `<style slot="head">`, or `<style is:global>`. Global page styles are kept from leaking by prefixing class names per page (for example `.post-*`, `.scf-*`/`.scr-*` in ContactSection, `.cu-*` on contact-us) or by the `pageClass` set on `<body>`.
- Colors are hard-coded hex values:
  - Brand blue `#0154b1`
  - CTA orange `#f09300` (`.btn-cta` and `.footer-cta-btn` in Layout)
  - Text `#282828` / `#0a0000`
  - Light section background `#faf9f5`
- Font: `'Outfit', sans-serif` (weights 400 to 800). Icons: Font Awesome classes (`fa-solid ...`).
- Layouts are responsive using `clamp()` font sizes and `@media` breakpoints in each file. Some inline `style=""` attributes exist.
- Interactive behavior is in vanilla `<script>` / `<script is:inline>` tags inside each page.
- Pages are made to match the old WordPress/Elementor site exactly, so keep visual changes minimal and limited to the page you are working on.

## Workflow notes

- Branch from `main` as `feat/<clickup-task-name>`. Don't commit directly to `main`/`develop`: pushing to `main` deploys to production.
- `npm install` currently reports 13 audit vulnerabilities. They have not been triaged.
