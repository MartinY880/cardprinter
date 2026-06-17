import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["cardprinter.martinyousif.com"],
    proxy: {
      '/api/token': {
        target: 'https://login.microsoftonline.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const tenantId = path.replace('/api/token/', '');
          return `/${tenantId}/oauth2/v2.0/token`;
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/pdk/auth': {
        target: 'https://accounts.pdk.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace('/pdk/auth', '/oauth2'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/pdk/accounts': {
        target: 'https://accounts.pdk.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace('/pdk/accounts', '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/pdk/systems': {
        target: 'https://systems.pdk.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace('/pdk/systems', ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/api/creds': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/api/presets': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/api/employees': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/api/printlog': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
});
