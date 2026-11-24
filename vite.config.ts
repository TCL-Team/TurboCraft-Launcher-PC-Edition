import path from 'node:path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error — plain ESM helper script
import { syncAllFromGradleProperties } from './scripts/syncProperties.mjs';

function gradlePropertiesSyncPlugin(): Plugin {
  const propsFile = path.resolve(process.cwd(), 'gradle.properties');
  return {
    name: 'tcl-gradle-properties-sync',
    buildStart() {
      syncAllFromGradleProperties(true);
    },
    configureServer(server) {
      server.watcher.add(propsFile);
      server.watcher.on('change', (changed) => {
        if (path.resolve(changed) === propsFile) {
          syncAllFromGradleProperties(false);
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [gradlePropertiesSyncPlugin(), react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3456',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
