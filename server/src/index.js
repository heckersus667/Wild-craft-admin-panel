import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the repo root if present (no dependency needed on Node 22).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));

const { default: express } = await import('express');
const { default: cookieParser } = await import('cookie-parser');
const { requireCsrfHeader } = await import('./auth.js');
const { default: api } = await import('./routes/api.js');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
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
app.use('/api', requireCsrfHeader, api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built frontend in production.
const dist = path.join(root, 'web/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && status !== 501 && status !== 502 ? 'Server error' : err.message });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`WildCraft admin API on http://localhost:${port}`));
