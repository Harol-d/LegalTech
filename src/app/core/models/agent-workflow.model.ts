/**
 * Estados del flujo de agentes (Human-in-the-Loop) y modelos de salida.
 */

/** Estado explícito de cada sección. */
export type SectionStatus = 'PENDING_GENERATION' | 'DRAFT_READY' | 'USER_EDITED' | 'APPROVED';

export const SECTION_STATUSES: readonly SectionStatus[] = [
  'PENDING_GENERATION',
  'DRAFT_READY',
  'USER_EDITED',
  'APPROVED',
] as const;

/** Etiquetas en español para cada estado. */
export const SECTION_STATUS_LABELS: Readonly<Record<SectionStatus, string>> = {
  PENDING_GENERATION: 'Pendiente de generación',
  DRAFT_READY: 'Borrador listo',
  USER_EDITED: 'Editado por usuario',
  APPROVED: 'Aprobado',
} as const;

/** Sección redactada de un documento. */
export interface DocumentSection {
  /** Identificador único de la sección. */
  id: string;
  /** Identificador de la sección en la plantilla. */
  templateSectionId: string;
  /** Título de la sección. */
  title: string;
  /** Contenido redactado en HTML (salida del editor). */
  content: string;
  status: SectionStatus;
  /** Marca de tiempo ISO de última modificación. */
  updatedAt: string;
}

/** Severidad de una observación del Agente Auditor de Coherencia. */
export type AuditSeverity = 'success' | 'info' | 'warn' | 'error';

/** Categoría de la observación. */
export type AuditCategory =
  | 'Coherencia'
  | 'Cumplimiento Legal'
  | 'Suma de Porcentajes'
  | 'Datos Faltantes'
  | 'Formato';

/** Observación del Agente Auditor. */
export interface AuditAlert {
  id: string;
  /** Id de la sección afectada, o null si es global. */
  sectionId: string | null;
  severity: AuditSeverity;
  category: AuditCategory;
  /** Mensaje en español. */
  message: string;
}

/** Roles de los agentes. */
export type AgentRole =
  | 'Agente Entrevistador'
  | 'Agente Redactor Legal'
  | 'Agente Auditor de Coherencia'
  | 'Agente Ensamblador y Formateador';

/** Estado de una actividad en la línea de tiempo. */
export type AgentActivityStatus = 'pending' | 'running' | 'done' | 'error';

/** Evento de progreso de un agente (p-timeline). */
export interface AgentTimelineEvent {
  id: string;
  agent: AgentRole;
  /** Mensaje en español. */
  message: string;
  status: AgentActivityStatus;
  /** Marca de tiempo ISO. */
  timestamp: string;
}

/** Bloque placeholder para campos por completar durante la revisión humana. */
export function generatePlaceholder(definition: { title: string }): string {
  return `<p><em>[Campo a completar: ${definition.title}.]</em></p>`;
}
