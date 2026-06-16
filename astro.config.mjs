import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  compressHTML: true,
  redirects: {
    '/services/cross-platform/': '/technologies/hybrid/',
    '/services/mobile/': '/services/app-development/',
  },
  devToolbar: {
    enabled: false,
  },
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      cssMinify: true,
      minify: 'esbuild',
    },
  },
});