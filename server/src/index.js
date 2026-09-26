import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the repo root if present (no dependency needed on Node 22).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';

const { default: express } = await import('express');
const { default: cookieParser } = await import('cookie-parser');
const { requireCsrfHeader } = await import('./auth.js');
const { default: api } = await import('./routes/api.js');

const app = express();
app.disable('x-powered-by');
// Only trust X-Forwarded-For when actually behind a proxy, or anyone can fake
// their IP (bypassing login limits and polluting the audit log).
// TRUST_PROXY = number of proxies in front (e.g. 1 for nginx, 2 for Cloudflare + nginx).
const trustProxy = Number(process.env.TRUST_PROXY) || 0;
if (trustProxy) app.set('trust proxy', trustProxy);
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
  });
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', requireCsrfHeader, api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built frontend in production.
const dist = path.join(root, 'web/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && status !== 501 && status !== 502 ? 'Server error' : err.message });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`WildCraft admin API on http://localhost:${port}`));
