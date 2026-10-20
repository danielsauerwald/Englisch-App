import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { processChat, processEvaluation } from './src/server/geminiService.ts';

function apiPlugin(): Plugin {
  return {
    name: 'drive-english-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        // Helper to read JSON body
        const readBody = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
              data += chunk;
            });
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (e) {
                reject(e);
              }
            });
            req.on('error', reject);
          });
        };

        const sendJson = (status: number, obj: any) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };

        try {
          if (req.url === '/api/version' && req.method === 'GET') {
            return sendJson(200, {
              version: '1.0.0',
              buildTime: '2026-10-20T12:00:00Z',
              name: 'DriveEnglish Car Mode',
            });
          }

          if (req.url === '/api/chat' && req.method === 'POST') {
            const body = await readBody();
            const result = await processChat(body);
            return sendJson(200, result);
          }

          if (req.url === '/api/evaluate' && req.method === 'POST') {
            const body = await readBody();
            const result = await processEvaluation(body);
            return sendJson(200, result);
          }

          return sendJson(404, { error: 'Not found' });
        } catch (error: any) {
          console.error('API error:', error);
          return sendJson(500, {
            error: error?.message || 'Internal server error processing request',
          });
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'version.json',
        ],
        manifest: {
          id: '/',
          name: 'DriveEnglish - Hands-Free AI Car Trainer',
          short_name: 'DriveEnglish',
          description: 'Interaktiver KI-Englisch-Sprachtrainer für die Autofahrt.',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
