import { defineConfig, type Plugin, type ViteDevServer, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createJiti } from 'jiti';

const jiti = createJiti(__filename);

// Simple middleware to handle Vercel-like API functions locally
const apiMiddleware = (): Plugin => {
  return {
    name: 'api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) => {
        if (req.url && req.url.startsWith('/api/')) {
          const url = new URL(req.url, 'http://localhost');
          const apiPath = path.join(process.cwd(), url.pathname + '.ts');

          if (fs.existsSync(apiPath)) {
            try {
              // Load the function using jiti (handles TS on the fly)
              const module = await jiti.import(apiPath) as { default: Function };
              const handler = module.default;

              if (typeof handler === 'function') {
                // Mock Vercel Request/Response roughly
                (req as any).query = Object.fromEntries(url.searchParams);
                (req as any).body = await new Promise((resolve) => {
                  let body = '';
                  req.on('data', (chunk: any) => body += chunk);
                  req.on('end', () => {
                    try { resolve(JSON.parse(body)); } catch { resolve(body); }
                  });
                });

                const json = (data: any) => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                };

                const status = (code: number) => {
                  res.statusCode = code;
                  return { json };
                };

                await handler(req as any, { status, json, setHeader: res.setHeader.bind(res), end: res.end.bind(res) } as any);
                return;
              }
            } catch (e: any) {
              console.error('API Handler Error:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Local API Error', details: e.message }));
              return;
            }
          }
        }
        next();
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiMiddleware()],
})
