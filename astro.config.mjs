// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Pages are prerendered; only /api/talep (the contact form) runs as a Vercel function.
export default defineConfig({
  site: 'https://recrestudio.dev',
  trailingSlash: 'never',
  adapter: vercel(),
  // CSS is small (~6 KB): inline it so the first paint is not blocked by extra requests.
  build: { inlineStylesheets: 'always' },
});
