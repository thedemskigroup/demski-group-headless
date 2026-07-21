import { defineConfig, sessionDrivers } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Nothing in this site uses Astro.session, but @astrojs/node auto-enables
  // a filesystem-backed session store whenever session.driver is unset. AWS
  // Amplify's compute bundle is deployed read-only (except /tmp), so any
  // request touching that store crashes with a 500. Force an in-memory
  // driver so it never tries to write to disk.
  session: {
    driver: sessionDrivers.memory(),
  },
  compressHTML: true,
  redirects: {
    '/services/cross-platform/': '/technologies/hybrid/',
    '/services/mobile/': '/services/app-development/',
  },
  devToolbar: {
    enabled: false,
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: true,
      minify: 'esbuild',
    },
  },
});