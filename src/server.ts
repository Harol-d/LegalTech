import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

import { createAiRouter } from './server/ai.routes';
import { loadDotEnv } from './server/env';
import { isAiEnabled } from './server/gemini.client';
import { ensureKnowledgeBaseIndexed } from './server/legal-knowledge-base';

// Carga `.env` (clave `key-Model`, modelo y configuración del RAG).
loadDotEnv();

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');

/**
 * API de IA (Google Gemini + File Search). La clave nunca llega al navegador:
 * los servicios Angular consumen estos endpoints.
 */
app.use('/api/ai', express.json({ limit: '1mb' }), createAiRouter());

/** Estado del servidor y de la configuración de IA. */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', aiEnabled: isAiEnabled() });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);

    // Precalienta el corpus legal (RAG) sin bloquear el arranque.
    if (isAiEnabled()) {
      ensureKnowledgeBaseIndexed(false)
        .then((status) =>
          console.log(`[rag] Corpus listo: ${status.storeName} (${status.indexedDocuments} documentos).`),
        )
        .catch((warmupError) =>
          console.warn('[rag] No se pudo preparar el corpus legal:', warmupError),
        );
    }
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
