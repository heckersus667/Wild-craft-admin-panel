import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const demoStore = fileURLToPath(new URL('./src/demo/memStore.js', import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Demo build: swap the Node file store for an in-memory one.
    mode === 'demo' && {
      name: 'demo-store',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === '../store.js' && importer?.includes('/server/src/game/')) return demoStore;
      },
    },
  ],
  build: mode === 'demo' ? { outDir: 'dist-demo', assetsInlineLimit: 1e9, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
}));
