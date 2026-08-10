import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // NEAR wallet-selector libs are Node-oriented and reference `global` and `process.env`. Map
    // them at build time so they don't throw "global/process is not defined". (`global`, `Buffer`
    // and a runtime `process` shim are also set in src/main.tsx, which covers bare `process`
    // lookups this define can't reach.)
    define: {
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Ensure `buffer` resolves to the real polyfill package, not Vite's externalized stub.
        buffer: 'buffer',
      },
    },
    optimizeDeps: {
      // Pre-bundle the buffer polyfill so its Buffer export is available in the browser.
      include: ['buffer'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Forward backend API calls to the Phase 2 backend (backend/, port 4000).
      // The app keeps calling /api/v1/* and /v2/*; Vite proxies them to the real server.
      proxy: {
        '/api/v1': { target: 'http://localhost:4000', changeOrigin: true },
        '/v2': { target: 'http://localhost:4000', changeOrigin: true },
        '/auth': { target: 'http://localhost:4000', changeOrigin: true },
      },
    },
  };
});
