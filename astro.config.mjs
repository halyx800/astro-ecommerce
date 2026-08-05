import { defineConfig } from 'astro/config';

// https://astro.build/config
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    sitemap({
      // Data endpoints, not real content pages — shouldn't be indexed.
      filter: (page) => !page.endsWith('/search-index.json') && !page.endsWith('/product-index.json'),
    }),
  ],
  site: 'https://www.orchidinsanity.com',
});