import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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
      },
    },
  };
});
