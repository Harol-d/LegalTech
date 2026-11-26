/**
 * Contratos de la capa de IA (Google Gemini + File Search / RAG).
 *
 * El navegador nunca habla directamente con Google: los servicios Angular
 * consumen los endpoints `/api/ai/*` expuestos por el servidor SSR, que es
 * el único que conoce la clave de API.
 */

/**
 * Modo de generación efectivo.
 * - `gemini-file-search`: Gemini con recuperación sobre el corpus legal (RAG).
 * - `gemini`: Gemini sin RAG (el File Search Store no estaba disponible).
 * - `unavailable`: IA no configurada o no disponible; no se generan borradores.
 */
export type AiMode = 'gemini-file-search' | 'gemini' | 'unavailable';

/** Etiquetas en español para la UI. */
export const AI_MODE_LABELS: Readonly<Record<AiMode, string>> = {
  'gemini-file-search': 'Gemini + File Search (RAG)',
  gemini: 'Gemini (sin RAG)',
  unavailable: 'IA no disponible',
} as const;

/** Fuente recuperada del corpus legal por el File Search Store. */
export interface RagCitation {
  /** Título del documento/cláusula recuperada. */
  title: string;
  /** URI o nombre del recurso en el store. */
  source: string | null;
  /** Fragmento recuperado (recortado). */
  snippet: string | null;
}

/** Estado del backend de IA. */
export interface AiStatus {
  /** `true` si hay clave configurada y el modelo puede invocarse. */
  enabled: boolean;
  /** Modelo de Google en uso. */
  model: string;
  /** Modelo configurado en `.env` (puede diferir si hubo respaldo). */
  configuredModel?: string;
  /** Modo efectivo actual. */
  mode: AiMode;
  /** Nombre del File Search Store (RAG), si existe. */
  storeName: string | null;
  /** Documentos indexados en el store. */
  indexedDocuments: number;
  /** Versión del corpus indexado. */
  corpusVersion: string | null;
  /** Lista de modelos disponibles reportados por Google. */
  availableModels?: AvailableModelItem[];
  /** Mensaje informativo en español (configuración / errores). */
  message: string;
}

/** Modelo de IA disponible reportado por la API de Google. */
export interface AvailableModelItem {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportsFileSearch: boolean;
}

/** Estado del corpus legal indexado. */
export interface KnowledgeBaseStatus {
  storeName: string | null;
  indexedDocuments: number;
  corpusVersion: string | null;
  indexedAt: string | null;
  /** Documentos que componen el corpus. */
  documents: string[];
}

/** Resultado de redactar una sección. */
export interface SectionDraftResponse {
  section: {
    id: string;
    templateSectionId: string;
    title: string;
    content: string;
    status: 'DRAFT_READY';
    updatedAt: string;
  };
  citations: RagCitation[];
  mode: AiMode;
}

/** Resultado de redactar el documento completo. */
export interface DocumentDraftResponse {
  sections: SectionDraftResponse['section'][];
  citations: RagCitation[];
  mode: AiMode;
}

/** Observación del Agente Auditor de Coherencia. */
export interface AiAuditAlert {
  sectionId: string | null;
  severity: 'success' | 'info' | 'warn' | 'error';
  category: 'Coherencia' | 'Cumplimiento Legal' | 'Suma de Porcentajes' | 'Datos Faltantes' | 'Formato';
  message: string;
}

/** Resultado de la auditoría asistida por IA. */
export interface AuditResponse {
  alerts: AiAuditAlert[];
  mode: AiMode;
}

/** Respuesta de error uniforme de `/api/ai/*`. */
export interface AiErrorResponse {
  error: 'AI_NOT_CONFIGURED' | 'AI_QUOTA_LIMIT' | 'AI_ERROR' | 'INVALID_REQUEST' | 'NOT_FOUND';
  message: string;
}
