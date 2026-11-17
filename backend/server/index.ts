import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { cpc, env, isProduction } from './config/env';
import { pool } from './db';
import routes from './routes';
import { checkDatabase } from './services/health';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/security';

const app = express();

if (env.nodeEnv === 'production') {
  // Trust the first proxy hop so rate limiting sees the real client IP.
  app.set('trust proxy', 1);
}

// Apply confidentiality/integrity/availability headers before anything else.
app.use(securityHeaders);

// Allow the React development server to call this API and send cookies.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

// A bounded JSON body protects availability from oversized requests.
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Health check that also verifies the database, so uptime monitors can detect
// a partially unavailable deployment instead of only checking the process.
app.get('/api/health', async (_req, res) => {
  const startedAt = Date.now();
  const database = await checkDatabase();
  const responseTimeMs = Date.now() - startedAt;

  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: `${cpc.systemName} API`,
    college: cpc.collegeName,
    checks: {
      database,
      assistant: env.assistant.apiKey
        ? 'external-provider-configured'
        : 'local-knowledge-base',
    },
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);

// In production we can serve the built React app from the same server.
const distDir = path.resolve(import.meta.dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

function warnOnDefaultSecrets(): void {
  if (!isProduction) return;

  const defaults: string[] = [];
  if (env.jwt.accessSecret.startsWith('dev-')) {
    defaults.push('JWT_ACCESS_SECRET');
  }
  if (env.jwt.refreshSecret.startsWith('dev-')) {
    defaults.push('JWT_REFRESH_SECRET');
  }

  if (defaults.length > 0) {
    console.warn(
      `Production is using default JWT secrets (${defaults.join(', ')}). Set long random values in .env before going live.`,
    );
  }
}

async function startServer(): Promise<void> {
  warnOnDefaultSecrets();
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
  });

  // Start the HTTP server even if PostgreSQL is temporarily unavailable.
// The health endpoint reports the degraded state.
const database = await checkDatabase();

if (database === 'ok') {
  console.log('Connected to Neon PostgreSQL database.');
} else {
  console.error(
    'PostgreSQL is not reachable yet; starting in degraded mode.',
  );
}

  const server = app.listen(env.port, () => {
    console.log(
      `${cpc.systemName} API for ${cpc.collegeName} running at http://localhost:${env.port}`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Closing the API server...`);
    server.close(() => {
      pool
        .end()
        .catch((error) => {
          console.error(
            'Could not close the database pool cleanly:',
            error instanceof Error ? error.message : error,
          );
        })
        .finally(() => process.exit(0));
    });

    // Do not wait forever for open keep-alive connections during shutdown.
    server.closeAllConnections?.();
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
