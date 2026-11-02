import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './lib/http.js';
import { notesRouter } from './routes/notes.js';
import { ideasRouter } from './routes/ideas.js';
import { profileRouter } from './routes/profile.js';

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server calls (no Origin header) and configured origins.
      if (!origin || config.frontendUrls.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mindspace-api' });
});

// Everything under /api requires a valid Supabase access token.
app.use('/api', requireAuth);
app.use('/api/profile', profileRouter);
app.use('/api/notes', notesRouter);
app.use('/api/ideas', ideasRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Mindspace API listening on http://localhost:${config.port}`);
  console.log(`Allowed frontend origins: ${config.frontendUrls.join(', ')}`);
});
