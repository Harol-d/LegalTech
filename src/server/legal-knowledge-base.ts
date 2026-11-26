import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LEGAL_TEMPLATES } from '../app/core/data/legal-templates';
import type { KnowledgeBaseStatus } from '../app/core/models/ai.model';
import type { DocumentTemplate } from '../app/core/models/document-template.model';
import {
  AiNotConfiguredError,
  getGenAiClient,
  getGeminiModel,
  isAiEnabled,
} from './gemini.client';

/**
 * Base de conocimiento legal (RAG) sobre Google File Search.
 *
 * El corpus se compone de:
 *  1. Las 9 plantillas validadas del catálogo (`legal-templates.ts`).
 *  2. Archivos opcionales `knowledge/*.md` o `knowledge/*.txt` (normativa,
 *     guías o doctrina que se quiera añadir al corpus).
 *
 * El store se crea/reutiliza automáticamente y se cachea en `.gemini-cache.json`.
 */

/** Nombre base del File Search Store. */
export const LEGAL_STORE_DISPLAY_NAME = 'legal-doc-wizard-colombia';

/** Modelo de embeddings de texto de Google. */
const EMBEDDING_MODEL = 'models/gemini-embedding-001';

const CACHE_FILE_NAME = '.gemini-cache.json';
const INDEX_TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 2_000;

export interface CorpusDocument {
  /** Identificador estable del documento dentro del corpus. */
  id: string;
  /** Nombre visible en el store. */
  displayName: string;
  /** Contenido en Markdown. */
  content: string;
}

interface StoreCache {
  storeName: string;
  corpusVersion: string;
  indexedDocuments: number;
  indexedAt: string;
}

let indexing: Promise<StoreCache> | null = null;

/** Construye el corpus (plantillas + `knowledge/`). */
export function buildCorpusDocuments(): CorpusDocument[] {
  const documents: CorpusDocument[] = LEGAL_TEMPLATES.map((template) => ({
    id: template.id,
    displayName: `Plantilla: ${template.name}`,
    content: renderTemplateMarkdown(template),
  }));

  const knowledgeDir = join(process.cwd(), 'knowledge');
  if (existsSync(knowledgeDir)) {
    const files = readdirSync(knowledgeDir)
      .filter((file) => /\.(md|txt)$/i.test(file))
      .sort();

    for (const file of files) {
      try {
        documents.push({
          id: `knowledge-${file}`,
          displayName: `Fuente legal: ${file}`,
          content: readFileSync(join(knowledgeDir, file), 'utf8'),
        });
      } catch (error) {
        console.warn(`[rag] No se pudo leer knowledge/${file}:`, error);
      }
    }
  }

  return documents;
}

/** Nombre del store configurado por variable de entorno (o `null`). */
export function getConfiguredStoreName(): string | null {
  const configured = (process.env['FILE_SEARCH_STORE_NAME'] ?? '').trim();
  return configured.length > 0 ? configured : null;
}

/** Estado actual del corpus sin llamar a la API de Google. */
export function getCachedStatus(): KnowledgeBaseStatus {
  const cache = readCache();
  return {
    storeName: getConfiguredStoreName() ?? cache?.storeName ?? null,
    indexedDocuments: cache?.indexedDocuments ?? 0,
    corpusVersion: cache?.corpusVersion ?? null,
    indexedAt: cache?.indexedAt ?? null,
    documents: buildCorpusDocuments().map((document) => document.displayName),
  };
}

/**
 * Garantiza que el corpus esté indexado en el File Search Store.
 * Idempotente: si la versión del corpus ya está indexada no vuelve a subir nada.
 */
export async function ensureKnowledgeBaseIndexed(force = false): Promise<KnowledgeBaseStatus> {
  if (!isAiEnabled()) throw new AiNotConfiguredError();

  const documents = buildCorpusDocuments();
  const corpusVersion = computeCorpusVersion(documents);
  const cache = readCache();

  const alreadyIndexed =
    !force &&
    cache !== null &&
    cache.corpusVersion === corpusVersion &&
    cache.indexedDocuments >= documents.length;

  if (alreadyIndexed) {
    return { ...getCachedStatus(), documents: documents.map((document) => document.displayName) };
  }

  if (!indexing) {
    indexing = indexCorpus(documents, corpusVersion, force).finally(() => {
      indexing = null;
    });
  }

  await indexing;

  return { ...getCachedStatus(), documents: documents.map((document) => document.displayName) };
}

/**
 * Nombres de stores a usar como herramienta RAG.
 * Devuelve `[]` si el corpus no pudo prepararse (la IA sigue funcionando sin RAG).
 */
export async function resolveRagStoreNames(): Promise<string[]> {
  if (!isAiEnabled()) return [];

  const cached = getCachedStatus();
  try {
    const status = await withTimeout(ensureKnowledgeBaseIndexed(false), RAG_WAIT_MS);
    if (!status) {
      // La indexación sigue en segundo plano: se usa el store ya conocido (si existe).
      console.log('[rag] La indexación aún está en curso; se responde sin esperar.');
      return cached.storeName ? [cached.storeName] : [];
    }
    return status.storeName ? [status.storeName] : [];
  } catch (error) {
    console.warn('[rag] File Search no disponible, se continúa sin RAG:', describeError(error));
    return cached.storeName ? [cached.storeName] : [];
  }
}

/** Espera máxima de la indexación antes de responder sin RAG (ms). */
const RAG_WAIT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
        (timer as unknown as { unref?: () => void }).unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

async function indexCorpus(
  documents: CorpusDocument[],
  corpusVersion: string,
  force: boolean,
): Promise<StoreCache> {
  const storeName = await resolveStoreName(corpusVersion, force);

  if (force) {
    await deleteAllDocuments(storeName);
  }

  for (const document of documents) {
    await uploadDocument(storeName, document);
  }

  const cache: StoreCache = {
    storeName,
    corpusVersion,
    indexedDocuments: documents.length,
    indexedAt: new Date().toISOString(),
  };
  writeCache(cache);
  console.log(`[rag] Corpus legal indexado en ${storeName} (${documents.length} documentos).`);
  return cache;
}

async function resolveStoreName(corpusVersion: string, force: boolean): Promise<string> {
  const ai = getGenAiClient();

  const configured = getConfiguredStoreName();
  if (configured) return configured;

  const cache = readCache();
  if (!force && cache && cache.corpusVersion === corpusVersion) {
    return cache.storeName;
  }

  const displayName = `${LEGAL_STORE_DISPLAY_NAME}-${corpusVersion}`;
  // `pageSize` debe estar entre 1 y 20 según la API de File Search.
  const stores = await ai.fileSearchStores.list({ config: { pageSize: 20 } });
  for await (const store of stores) {
    if (store.displayName === displayName && store.name) {
      return store.name;
    }
  }

  const created = await ai.fileSearchStores.create({
    config: { displayName, embeddingModel: EMBEDDING_MODEL },
  });

  if (!created.name) {
    throw new Error('Google no devolvió el nombre del File Search Store creado.');
  }
  return created.name;
}

async function uploadDocument(storeName: string, document: CorpusDocument): Promise<void> {
  const ai = getGenAiClient();

  let operation = await ai.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName: storeName,
    file: new Blob([document.content], { type: 'text/markdown' }),
    config: {
      displayName: document.displayName,
      mimeType: 'text/markdown',
      customMetadata: [{ key: 'corpus_id', stringValue: document.id }],
    },
  });

  const startedAt = Date.now();
  while (!operation.done) {
    if (Date.now() - startedAt > INDEX_TIMEOUT_MS) {
      throw new Error(`Tiempo de indexación agotado para "${document.displayName}".`);
    }
    await sleep(POLL_INTERVAL_MS);
    operation = await ai.operations.get({ operation });
  }

  if (operation.error) {
    throw new Error(
      `Google rechazó la indexación de "${document.displayName}": ${JSON.stringify(operation.error)}`,
    );
  }
}

async function deleteAllDocuments(storeName: string): Promise<void> {
  const ai = getGenAiClient();
  const documents = await ai.fileSearchStores.documents.list({ parent: storeName });

  for await (const document of documents) {
    if (!document.name) continue;
    await ai.fileSearchStores.documents.delete({ name: document.name, config: { force: true } });
  }
}

function renderTemplateMarkdown(template: DocumentTemplate): string {
  const lines: string[] = [
    `# ${template.name}`,
    '',
    `- Categoría: ${template.category}`,
    `- Descripción: ${template.description}`,
    `- Base legal: ${template.legalBasis.join('; ')}`,
    '',
    '## Cláusulas de la plantilla',
    '',
  ];

  for (const section of template.sections) {
    lines.push(`### ${section.title}`, '', `Guía de redacción: ${section.guidance}`);
    if (section.legalBasis) lines.push(`Base legal: ${section.legalBasis}`);
    if (section.seed) lines.push('', `Texto de referencia: ${section.seed}`);
    lines.push('');
  }

  return lines.join('\n');
}

/** Hash determinista del corpus (FNV-1a) + modelo de embeddings. */
function computeCorpusVersion(documents: CorpusDocument[]): string {
  const payload = `${EMBEDDING_MODEL}|${documents
    .map((document) => `${document.id}:${document.content.length}`)
    .join('|')}`;

  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16)}-${getGeminiModel().replace(/[^a-z0-9]/gi, '')}`;
}

function cacheFilePath(): string {
  return join(process.cwd(), CACHE_FILE_NAME);
}

function readCache(): StoreCache | null {
  const path = cacheFilePath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<StoreCache>;
    if (!parsed.storeName || !parsed.corpusVersion) return null;
    return {
      storeName: parsed.storeName,
      corpusVersion: parsed.corpusVersion,
      indexedDocuments: Number(parsed.indexedDocuments) || 0,
      indexedAt: parsed.indexedAt ?? '',
    };
  } catch {
    return null;
  }
}

function writeCache(cache: StoreCache): void {
  try {
    writeFileSync(cacheFilePath(), JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.warn('[rag] No se pudo guardar la cache del store:', describeError(error));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
