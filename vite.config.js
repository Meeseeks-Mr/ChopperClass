import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site under https://<user>.github.io/ChopperClass/
  // so every asset URL needs that prefix. If you fork to a different repo
  // name, change this string to match.
  base: '/ChopperClass/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
});
