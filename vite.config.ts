import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleEmailRequest } from './server/emailHandler';

const readRequestBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const sendJson = (
  res: ServerResponse<IncomingMessage>,
  status: number,
  body: unknown
) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'local-email-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/send-email')) {
              next();
              return;
            }

            try {
              const rawBody = await readRequestBody(req);
              const result = await handleEmailRequest({
                method: req.method,
                rawBody,
                env,
                headers: req.headers,
              });

              sendJson(res, result.status, result.body);
            } catch (error) {
              console.error('Local email middleware failed:', error);
              sendJson(res, 500, {
                ok: false,
                message: 'Unable to send email.',
              });
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
