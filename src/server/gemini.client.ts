import { GoogleGenAI } from '@google/genai';
import type { GenerateContentResponse, Schema } from '@google/genai';

import type { RagCitation } from '../app/core/models/ai.model';

/** Modelo de Google por defecto (único proveedor de IA del proyecto). */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Modelos de respaldo. Si el modelo configurado está saturado (503), no existe
 * (404) o agotó su cuota (429), se prueba el siguiente automáticamente.
 */
export const GEMINI_MODEL_FALLBACKS: readonly string[] = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

/** Tiempo máximo de un intento contra el modelo (ms). */
export const AI_REQUEST_TIMEOUT_MS = 60_000;

/** Presupuesto total de una generación incluyendo reintentos (ms). */
export const AI_TOTAL_BUDGET_MS = 150_000;

/** Error controlado: no hay clave configurada. */
export class AiNotConfiguredError extends Error {
  constructor() {
    super('Falta la clave de API de Google (model) en el archivo .env.');
    this.name = 'AiNotConfiguredError';
  }
}

let client: GoogleGenAI | null = null;

/**
 * Clave de API. Se acepta `model` (nombre solicitado en `.env`) y, como
 * respaldo, las variables estándar de Google.
 */
export function getApiKey(): string | null {
  const raw =
    process.env['model'] ??
    process.env['GEMINI_API_KEY'] ??
    process.env['GOOGLE_API_KEY'] ??
    '';
  const key = raw.trim();
  return key.length > 0 ? key : null;
}

/** `true` cuando la IA real está configurada. */
export function isAiEnabled(): boolean {
  return getApiKey() !== null;
}

let selectedGeminiModel: string | null = null;

/** Fija el modelo de Gemini a usar en tiempo de ejecución. */
export function setSelectedGeminiModel(model: string | null): void {
  selectedGeminiModel = model?.trim() || null;
  activeModel = null;
}

/** Modelo de Google configurado (nunca otro proveedor). */
export function getGeminiModel(): string {
  if (selectedGeminiModel) return selectedGeminiModel;
  const configured = (process.env['GEMINI_MODEL'] ?? '').trim();
  return configured.length > 0 ? configured : DEFAULT_GEMINI_MODEL;
}

/** Información simplificada de un modelo de Google disponible. */
export interface AvailableModelInfo {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportsFileSearch: boolean;
}

/** Lista los modelos disponibles mediante el cliente de Google Gen AI. */
export async function listAvailableModels(): Promise<AvailableModelInfo[]> {
  const fallbackList: AvailableModelInfo[] = [
    {
      name: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      description: 'Modelo de última generación rápido y multimodal optimizado para generación y RAG.',
      supportsFileSearch: true,
    },
    {
      name: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite',
      description: 'Versión ligera de alto rendimiento con latencia reducida.',
      supportsFileSearch: true,
    },
    {
      name: 'gemini-flash-latest',
      displayName: 'Gemini Flash Latest',
      description: 'Última versión estable del canal Flash.',
      supportsFileSearch: true,
    },
    {
      name: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro',
      description: 'Modelo de alto razonamiento para tareas complejas y análisis legal profundo.',
      supportsFileSearch: true,
    },
  ];

  if (!isAiEnabled()) {
    return [];
  }

  try {
    const ai = getGenAiClient();
    const result = await ai.models.list();
    const models: AvailableModelInfo[] = [];

    for await (const m of result) {
      const modelId = (m.name ?? '').replace(/^models\//, '');
      const actions = m.supportedActions ?? [];
      // Filtrar modelos que admitan generación de contenido
      const isGenerateModel =
        actions.length === 0 ||
        actions.some((a: string) => a.toLowerCase().includes('generatecontent'));

      if (isGenerateModel && modelId.toLowerCase().includes('gemini')) {
        models.push({
          name: modelId,
          displayName: m.displayName || modelId,
          description: m.description || '',
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
          supportsFileSearch: true,
        });
      }
    }

    if (models.length > 0) {
      return models;
    }
    return fallbackList;
  } catch (err) {
    console.warn('No se pudo listar los modelos en vivo de Google Gen AI; usando lista local:', err);
    return fallbackList;
  }
}

/** Modelos a probar en orden: el configurado y luego los de respaldo. */
export function getGeminiModelCandidates(): string[] {
  return [getGeminiModel(), ...GEMINI_MODEL_FALLBACKS].filter(
    (model, index, list) => list.indexOf(model) === index,
  );
}

/** Último modelo que respondió correctamente (para diagnóstico/estado). */
let activeModel: string | null = null;

/** Modelo realmente en uso (el último que respondió o el configurado). */
export function getActiveGeminiModel(): string {
  return activeModel ?? getGeminiModel();
}

/** Versión de la API de Gemini (v1beta habilita instrucciones de sistema y File Search). */
export const DEFAULT_GEMINI_API_VERSION = 'v1beta';

/** Cliente perezoso (singleton por proceso). */
export function getGenAiClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) throw new AiNotConfiguredError();
  if (!client) {
    const apiVersion = (process.env['GEMINI_API_VERSION'] ?? '').trim() || DEFAULT_GEMINI_API_VERSION;
    client = new GoogleGenAI({ apiKey, apiVersion });
  }
  return client;
}

export interface StructuredGenerationRequest {
  /** Instrucción de sistema (rol del agente, reglas). */
  systemInstruction: string;
  /** Prompt de usuario con el contexto concreto. */
  prompt: string;
  /** Esquema JSON de salida. */
  schema: Schema;
  /** Stores de File Search para el RAG (vacío = sin RAG). */
  fileSearchStoreNames?: readonly string[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface StructuredGenerationResult<T> {
  /** Objeto parseado, o `null` si el modelo no devolvió JSON válido. */
  data: T | null;
  /** Texto crudo devuelto por el modelo. */
  text: string;
  /** Fuentes recuperadas del corpus legal. */
  citations: RagCitation[];
  /** `true` si el modelo usó el File Search Store. */
  grounded: boolean;
}

/**
 * Llamada a Gemini con salida JSON estructurada y, opcionalmente, la
 * herramienta File Search (RAG) sobre el corpus legal.
 */
export async function generateStructured<T>(
  request: StructuredGenerationRequest,
): Promise<StructuredGenerationResult<T>> {
  const ai = getGenAiClient();
  const storeNames = [...(request.fileSearchStoreNames ?? [])];
  const hasStores = storeNames.length > 0;

  // Dos ejes de degradación:
  //  1. Modelo: si el configurado está saturado (503), no existe (404) o
  //     agotó cuota (429), se prueba el siguiente de la lista.
  //  2. Formato: algunos modelos rechazan `responseSchema` junto con la
  //     herramienta File Search; se reintenta sin esquema y luego sin RAG.
  const startedAt = Date.now();

  let lastError: unknown = null;

  for (const model of getGeminiModelCandidates()) {
    const attempts = buildAttempts(hasStores, model);
    let modelUnavailable = false;

    for (const attempt of attempts) {
      if (attempt.withTools && toolsUnsupportedModels.has(model)) continue;

      let busyRetries = 0;

      while (!modelUnavailable) {
        if (Date.now() - startedAt > AI_TOTAL_BUDGET_MS) {
          throw lastError instanceof Error
            ? lastError
            : new Error('Se agotó el tiempo de espera de la IA de Google.');
        }

        try {
          const response = await ai.models.generateContent({
            model,
            contents: request.prompt,
            config: {
              systemInstruction: request.systemInstruction,
              temperature: request.temperature ?? 0.3,
              maxOutputTokens: request.maxOutputTokens ?? 8192,
              httpOptions: { timeout: AI_REQUEST_TIMEOUT_MS },
              ...(attempt.withSchema
                ? { responseMimeType: 'application/json', responseSchema: request.schema }
                : {}),
              ...(attempt.withTools
                ? { tools: [{ fileSearch: { fileSearchStoreNames: storeNames } }] }
                : {}),
            },
          });

          activeModel = model;

          const text = response.text ?? '';
          const citations = extractCitations(response);

          return {
            data: parseJson<T>(text),
            text,
            citations,
            grounded: citations.length > 0,
          };
        } catch (error) {
          lastError = error;
          if (isFatalAuthError(error)) throw error;

          // 503 es transitorio: un reintento corto antes de cambiar de modelo.
          if (isTransientBusy(error) && busyRetries < 1) {
            busyRetries += 1;
            console.warn(`[ai] ${model} saturado; reintentando en 2,5 s…`);
            await sleep(2_500);
            continue;
          }

          if (looksLikeSchemaToolConflict(error)) schemaWithToolsUnsupported = true;

          // El modelo no admite File Search: se recuerda y se continúa sin RAG.
          if (attempt.withTools && looksLikeToolsUnsupported(error)) {
            toolsUnsupportedModels.add(model);
            console.warn(`[ai] ${model} no admite File Search; se continúa sin RAG.`);
            break;
          }

          const modelLevel = isModelLevelFailure(error);
          console.warn(
            `[ai] Falló ${model} (${attempt.label}): ${describeError(error)}${
              modelLevel ? ' → se prueba el siguiente modelo' : ' → se prueba otra configuración'
            }`,
          );

          // Saturación, cuota o modelo inexistente: no cambia el formato,
          // se pasa al siguiente modelo.
          if (modelLevel) modelUnavailable = true;
          break;
        }
      }

      if (modelUnavailable) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

interface GenerationAttempt {
  label: string;
  withTools: boolean;
  withSchema: boolean;
}

/**
 * Google Gemini rechaza formalmente `responseMimeType: 'application/json'` o
 * `responseSchema` cuando se activa cualquier herramienta (p. ej. `tools: [{ fileSearch }]`).
 * Por tanto, iniciamos en `true` para no perder tiempo intentando esa combinación no admitida.
 */
let schemaWithToolsUnsupported = true;

/** Modelos que no soportan la herramienta File Search (se recuerdan). */
const toolsUnsupportedModels = new Set<string>();

/** Combinaciones de configuración a probar, de la más completa a la más simple. */
function buildAttempts(hasStores: boolean, model: string): GenerationAttempt[] {
  const attempts: GenerationAttempt[] = [];
  const push = (withTools: boolean, withSchema: boolean, label: string): void => {
    if (attempts.some((item) => item.withTools === withTools && item.withSchema === withSchema)) return;
    attempts.push({ withTools, withSchema, label });
  };

  const canUseTools = hasStores && !toolsUnsupportedModels.has(model);

  if (canUseTools) {
    if (!schemaWithToolsUnsupported) push(true, true, 'RAG + esquema JSON');
    push(true, false, 'RAG sin esquema');
  }
  push(false, true, 'esquema JSON sin RAG');
  push(false, false, 'sin RAG ni esquema');

  return attempts;
}

/** `true` si el modelo no admite la herramienta File Search. */
function looksLikeToolsUnsupported(error: unknown): boolean {
  return /file ?search[^.]{0,60}(not supported|unsupported)|tool[s]?[^.]{0,40}(not supported|unsupported)/i.test(
    describeError(error),
  );
}

/** 503 (saturación) sí es transitorio; 429 (cuota) no. */
function isTransientBusy(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 503 || /high demand|overloaded|UNAVAILABLE/i.test(describeError(error));
}

/** `true` si el error indica que esquema JSON + herramientas no son compatibles. */
function looksLikeSchemaToolConflict(error: unknown): boolean {
  return /response mime type|response_mime_type|tool use with a response/i.test(describeError(error));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fallo atribuible al modelo (saturación, cuota, inexistente), no al formato. */
function isModelLevelFailure(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  if (status === 503 || status === 404 || status === 429) return true;
  return /high demand|overloaded|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND/i.test(describeError(error));
}

/** `true` si Google está saturado o sin cuota (mensaje específico para la UI). */
export function isModelBusyError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  if (status === 503 || status === 429) return true;
  return /high demand|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(describeError(error));
}

/** `true` si Google rechazó la solicitud por límite de cuota. */
export function isModelQuotaError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(describeError(error));
}

/** Errores de configuración que no mejoran al reintentar. */
function isFatalAuthError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  if (status === 401 || status === 403) return true;

  const message = describeError(error);
  return /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED|not enabled/i.test(message);
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Extrae las fuentes del `groundingMetadata` de la respuesta. */
function extractCitations(response: GenerateContentResponse): RagCitation[] {
  const chunks = (response.candidates ?? []).flatMap(
    (candidate) => candidate.groundingMetadata?.groundingChunks ?? [],
  );

  const citations: RagCitation[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const context = chunk.retrievedContext;
    if (!context) continue;

    const title = (context.title ?? '').trim() || 'Documento del corpus legal';
    const source = (context.uri ?? context.documentName ?? context.fileSearchStore ?? '').trim() || null;
    const snippet = (context.text ?? '').trim().slice(0, 320) || null;
    const dedupeKey = `${title}|${source ?? ''}`;

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    citations.push({ title, source, snippet });

    if (citations.length >= 12) break;
  }

  return citations;
}

/** Parseo tolerante: acepta JSON puro o envuelto en un bloque de código. */
function parseJson<T>(raw: string): T | null {
  const text = raw.trim();
  if (!text) return null;

  const candidates: string[] = [text];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // siguiente candidato
    }
  }

  return null;
}
