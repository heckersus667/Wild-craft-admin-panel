import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const demoApi = fileURLToPath(new URL('./src/demo/fakeApi.js', import.meta.url));
const demoStore = fileURLToPath(new URL('./src/demo/memStore.js', import.meta.url));

// "virtual:demo-api" is the in-browser fake server in the demo build, and an
// empty stub otherwise, so the normal build never pulls in server code.
function demoPlugin(isDemo) {
  return {
    name: 'demo',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'virtual:demo-api') return isDemo ? demoApi : '\0demo-api-stub';
      if (isDemo && source === '../store.js' && importer?.includes('/server/src/game/')) return demoStore;
    },
    load(id) {
      if (id === '\0demo-api-stub') return 'export const demoApi = null;';
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), demoPlugin(mode === 'demo')],
  build:
    mode === 'demo'
      ? { outDir: 'dist-demo', assetsInlineLimit: 1e9, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } }
      : {},
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
}));
