import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { api } from './routes.js';
import { connectDatabase, closeDatabase } from './database.js';
import { seedDemoData } from './seed-data.js';
import { uploadRoot } from './uploads.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProduction) throw new Error('JWT_SECRET is required in production.');
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  console.warn('JWT_SECRET is not set; generated a process-only development secret. Sessions will expire when this process restarts.');
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, frameguard: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      const local = ['localhost', '127.0.0.1'].includes(url.hostname);
      const preview = url.hostname.endsWith('.manus.computer');
      const configured = process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN;
      return callback(null, Boolean(local || preview || configured));
    } catch {
      return callback(null, false);
    }
  },
  allowedHeaders: ['Content-Type', 'X-Session-Token', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use('/uploads/items', express.static(path.join(uploadRoot, 'items'), { maxAge: '1h', index: false }));
app.use('/uploads/profiles', express.static(path.join(uploadRoot, 'profiles'), { maxAge: '1h', index: false }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

let vite;
if (isProduction) {
  const dist = path.resolve(projectRoot, 'client/dist');
  app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders(res, filePath) {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    if (req.path.startsWith('/assets/') || path.extname(req.path)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  vite = await createViteServer({
    configFile: path.resolve(projectRoot, 'vite.config.js'),
    server: { middlewareMode: true, hmr: { clientPort: 443 } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.use((req, res) => res.status(404).json({ message: `No route found for ${req.method} ${req.path}.` }));
app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const isMulterError = error.name === 'MulterError';
  const status = error.status || (isMulterError ? 400 : error.code === 11000 ? 409 : 500);
  if (status >= 500) console.error(error);
  const message = error.code === 11000
    ? 'A record with that value already exists.'
    : isMulterError
      ? (error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 4 MB or smaller.' : 'Choose one supported image and try again.')
      : status >= 500
        ? 'Something went wrong. Please try again.'
        : error.message || 'Something went wrong. Please try again.';
  return res.status(status).json({ message, ...(error.details ? { errors: error.details } : {}) });
});

await connectDatabase();
if (!isProduction && process.env.SEED_DEMO_DATA !== 'false') await seedDemoData();
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, '0.0.0.0', () => console.log(`Campus Found listening on 0.0.0.0:${port}`));

async function shutdown() {
  server.close(async () => {
    if (vite) await vite.close();
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
