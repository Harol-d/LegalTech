import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';

import { DocumentTemplate, LegalSectionDefinition } from '../models/document-template.model';
import {
  AuditAlert,
  AuditSeverity,
  DocumentSection,
  generatePlaceholder,
} from '../models/agent-workflow.model';
import { StartupContext, totalSharePercentage } from '../models/startup-context.model';
import type { AiAuditAlert, AiMode, AiStatus, RagCitation } from '../models/ai.model';
import { AiGatewayError, AiGatewayService } from './ai-gateway.service';

// Re-exportamos helpers de id desde el modelo de startup para no duplicar.
export { generateId } from '../models/startup-context.model';

/** Latencia simulada del modo local de respaldo (ms). */
export const AGENT_MOCK_LATENCY_MS = 900;

/** Resultado de redactar un documento completo. */
export interface DocumentDraftResult {
  sections: DocumentSection[];
  citations: RagCitation[];
  mode: AiMode;
}

/**
 * Orquestador de agentes.
 *
 * - Agente Redactor Legal: `generateDocumentDraft`, `generateSectionDraft`,
 *   `regenerateSection` → Google Gemini con RAG (File Search) a través de
 *   `AiGatewayService`.
 * - Agente Auditor de Coherencia: `auditSections` → reglas deterministas
 *   locales + observaciones del modelo.
 * - Persiste los datos maestros de la startup en memoria (servicio) para
 *   reutilizarlos al generar múltiples documentos en la misma sesión.
 *
 * Resiliencia: si la IA no está configurada (sin `model`), se generan
 * borradores locales. Los errores de una solicitud real se propagan para que
 * la UI pueda informar al usuario y permitirle reintentar.
 */
@Injectable({ providedIn: 'root' })
export class AgentOrchestratorService {
  private readonly ai = inject(AiGatewayService);

  // ---- Estado en memoria (Paso 1 persistido para reutilizar en la sesión) ----
  private readonly _startupContext = signal<StartupContext | null>(null);
  /** Contexto de la startup actualmente en memoria. */
  readonly startupContext = this._startupContext.asReadonly();

  /** Modo de generación de la última respuesta. */
  private readonly _aiMode = signal<AiMode>('local-fallback');
  readonly aiMode = this._aiMode.asReadonly();

  /** Estado de la IA en el servidor (última consulta). */
  private readonly _aiStatus = signal<AiStatus | null>(null);
  readonly aiStatus = this._aiStatus.asReadonly();

  /** Fuentes del corpus legal usadas en la última generación (RAG). */
  private readonly _lastCitations = signal<RagCitation[]>([]);
  readonly lastCitations = this._lastCitations.asReadonly();

  /** Persistir datos maestros de la startup en memoria/estado del servicio. */
  setStartupContext(context: StartupContext): void {
    this._startupContext.set(structuredCloneSafe(context));
  }

  /** Recuperar los datos maestros persistidos (o null). */
  getStartupContext(): StartupContext | null {
    const ctx = this._startupContext();
    return ctx ? structuredCloneSafe(ctx) : null;
  }

  /** Limpiar el contexto en memoria. */
  clearStartupContext(): void {
    this._startupContext.set(null);
  }

  // ---- Estado de la IA ------------------------------------------------------

  /** Consulta el estado de la IA en el servidor (modelo, RAG, documentos). */
  refreshAiStatus(): Observable<AiStatus | null> {
    return this.ai.getStatus().pipe(
      tap((status) => {
        this._aiStatus.set(status);
        this._aiMode.set(status.mode);
      }),
      map((status) => status),
      catchError(() => {
        this._aiStatus.set(null);
        this._aiMode.set('local-fallback');
        return of(null);
      }),
    );
  }

  /** Reindexa el corpus legal (RAG) bajo demanda. */
  reindexKnowledgeBase(): Observable<boolean> {
    return this.ai.indexKnowledgeBase().pipe(
      tap(() => void this.refreshAiStatus().subscribe()),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Cambia el modelo de Google en uso. */
  changeModel(model: string): Observable<boolean> {
    return this.ai.setModel(model).pipe(
      tap(() => void this.refreshAiStatus().subscribe()),
      map((res) => res.success),
      catchError(() => of(false)),
    );
  }

  // ---- Agente Redactor Legal -----------------------------------------------

  /**
   * Redacta todas las cláusulas del documento en una sola llamada a Gemini
   * (con RAG sobre el corpus legal). Si la IA no está configurada, devuelve
   * borradores locales; si una solicitud real falla, propaga el error.
   */
  generateDocumentDraft(template: DocumentTemplate, context: StartupContext): Observable<DocumentDraftResult> {
    return this.ai.draftDocument(template.id, context).pipe(
      map((response) => {
        this.applyMode(response.mode);
        this._lastCitations.set(response.citations ?? []);
        return {
          sections: response.sections.map((section) => ({ ...section })),
          citations: response.citations ?? [],
          mode: response.mode,
        };
      }),
      catchError((error: unknown) =>
        isAiNotConfigured(error)
          ? this.buildLocalDocument(template, context)
          : throwError(() => error),
      ),
    );
  }

  /** Redacta una única cláusula. */
  generateSectionDraft(
    sectionDefinition: LegalSectionDefinition,
    template: DocumentTemplate,
    context: StartupContext,
  ): Observable<DocumentSection> {
    return this.ai.draftSection(template.id, context, sectionDefinition.id).pipe(
      map((response) => {
        this.applyMode(response.mode);
        this._lastCitations.set(response.citations ?? []);
        return { ...response.section };
      }),
      catchError((error: unknown) =>
        isAiNotConfigured(error)
          ? this.buildLocalSection(sectionDefinition, template, context)
          : throwError(() => error),
      ),
    );
  }

  /**
   * Regenera una sección con una instrucción de ajuste del usuario (HITL).
   * El resultado vuelve a estado `DRAFT_READY` y requiere re-aprobación.
   */
  regenerateSection(
    section: DocumentSection,
    instruction: string,
    template: DocumentTemplate,
    context: StartupContext,
  ): Observable<DocumentSection> {
    const definition = this.findDefinition(section, template);

    return this.ai
      .regenerateSection(template.id, context, definition.id, section.content, instruction)
      .pipe(
        map((response) => {
          this.applyMode(response.mode);
          this._lastCitations.set(response.citations ?? []);
          return { ...response.section };
        }),
        catchError((error: unknown) =>
          isAiNotConfigured(error)
            ? of({
                ...section,
                content: appendRegenerationNote(
                  buildMockedDraft(definition, template, context),
                  instruction,
                  section.content,
                ),
                status: 'DRAFT_READY' as DocumentSection['status'],
                updatedAt: new Date().toISOString(),
              }).pipe(
                delay(AGENT_MOCK_LATENCY_MS),
                tap(() => this.applyMode('local-fallback')),
              )
            : throwError(() => error),
        ),
      );
  }

  // ---- Agente Auditor de Coherencia ----------------------------------------

  /**
   * Audita coherencia entre secciones y datos maestros + cumplimiento legal.
   * Combina las reglas deterministas locales (suma de porcentajes, datos
   * obligatorios, secciones vacías) con las observaciones del modelo.
   */
  auditSections(
    sections: readonly DocumentSection[],
    context: StartupContext,
    template: DocumentTemplate,
  ): Observable<AuditAlert[]> {
    const localAlerts = computeAuditAlerts(sections, context, template);

    // Si todas las secciones provienen de la IA o están aprobadas, las reglas locales
    // cubren la auditoría matemática y estructural sin gastar cuota adicional de Gemini.
    if (this.aiMode() === 'gemini-file-search' || this.aiMode() === 'gemini') {
      return of(localAlerts);
    }

    return this.ai.audit(template.id, context, sections).pipe(
      map((response) => {
        this.applyMode(response.mode);
        return mergeAlerts(localAlerts, response.alerts ?? []);
      }),
      catchError(() => {
        this.applyMode('local-fallback');
        return of(localAlerts);
      }),
    );
  }

  // ---- internos ------------------------------------------------------------

  private applyMode(mode: AiMode): void {
    this._aiMode.set(mode);
  }

  private findDefinition(section: DocumentSection, template: DocumentTemplate): LegalSectionDefinition {
    return (
      template.sections.find((candidate) => candidate.id === section.templateSectionId) ?? {
        id: section.templateSectionId,
        title: section.title,
        guidance: '',
      }
    );
  }

  private buildLocalSection(
    definition: LegalSectionDefinition,
    template: DocumentTemplate,
    context: StartupContext,
  ): Observable<DocumentSection> {
    const section: DocumentSection = {
      id: `section-${definition.id}`,
      templateSectionId: definition.id,
      title: definition.title,
      content: buildMockedDraft(definition, template, context),
      status: 'DRAFT_READY',
      updatedAt: new Date().toISOString(),
    };

    return of(section).pipe(
      delay(AGENT_MOCK_LATENCY_MS),
      tap(() => this.applyMode('local-fallback')),
    );
  }

  private buildLocalDocument(template: DocumentTemplate, context: StartupContext): Observable<DocumentDraftResult> {
    this._lastCitations.set([]);

    const drafts = template.sections.map((definition) =>
      this.buildLocalSection(definition, template, context),
    );

    return forkJoin(drafts).pipe(
      map((sections) => ({
        sections,
        citations: [] as RagCitation[],
        mode: 'local-fallback' as AiMode,
      })),
    );
  }
}

function isAiNotConfigured(error: unknown): boolean {
  return error instanceof AiGatewayError && error.code === 'AI_NOT_CONFIGURED';
}

// ---------------------------------------------------------------------------
// Helpers internos (lógica de negocio fuera de los componentes / templates).
// ---------------------------------------------------------------------------

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let idCounter = 0;
function nextAlertId(): string {
  idCounter += 1;
  return `audit-${Date.now().toString(36)}-${idCounter}`;
}

/** Genera un borrador HTML local (modo de respaldo) para una sección. */
function buildMockedDraft(definition: LegalSectionDefinition, template: DocumentTemplate, ctx: StartupContext): string {
  const company = escapeHtml(ctx.legalName || ctx.companyName || '[Nombre de la sociedad]');
  const title = escapeHtml(definition.title);
  const guidance = escapeHtml(definition.guidance || '');
  const basis = definition.legalBasis ? `<p><em>Base legal de referencia: ${escapeHtml(definition.legalBasis)}.</em></p>` : '';

  const partnerRows = ctx.partners.length
    ? `<ul>${ctx.partners
        .map(
          (p) =>
            `<li>${escapeHtml(p.fullName || '[Nombre del socio]')} — ${escapeHtml(String(p.sharePercentage))}% — ${escapeHtml(
              p.role,
            )} — ${escapeHtml(p.documentType)} ${escapeHtml(p.documentNumber || '[número]')}</li>`,
        )
        .join('')}</ul>`
    : '<p><em>[Agregar socios en el Paso 1.]</em></p>';

  const intro = `<h3>${title}</h3>`;
  const draftNote = `<p><em>[Borrador de demostración generado localmente (sin conexión a la IA). Configure la variable model en el archivo .env para usar Google Gemini con RAG. Requiere revisión humana y validación por un abogado.]</em></p>`;

  const body = renderSectionBody(definition, template, company, ctx, partnerRows);

  return `${intro}${draftNote}<p>${guidance}</p>${body}${basis}`;
}

function renderSectionBody(
  definition: LegalSectionDefinition,
  template: DocumentTemplate,
  company: string,
  ctx: StartupContext,
  partnerRows: string,
): string {
  const id = definition.id;

  if (id === 'nombre-razon-social' || id === 'partes' || id === 'responsable') {
    return `<p>Sociedad: <strong>${company}</strong>${ctx.nit ? `, NIT ${escapeHtml(ctx.nit)}` : ''}.${
      id === 'partes' ? ' Partes del contrato: ' + partnerRows : ''
    }</p>`;
  }
  if (id === 'socios' || id === 'participacion' || id === 'aportes') {
    return `<p>Socios y participación accionaria (suma total ${round2(totalSharePercentage(ctx.partners))}%):</p>${partnerRows}`;
  }
  if (id === 'capital-social') {
    return `<p>Capital social inicial: <strong>$${formatCop(ctx.capitalSocial)} COP</strong>. Número total de acciones: <strong>${ctx.numberOfShares}</strong>. Valor nominal por acción: <strong>$${formatCop(
      ctx.shareNominalValue,
    )} COP</strong>.</p>${partnerRows}`;
  }
  if (id === 'objeto-social') {
    return `<p>Objeto social de <strong>${company}</strong>: ${escapeHtml(ctx.corporatePurpose || '[describir actividades económicas]')}.</p>`;
  }
  if (id === 'domicilio') {
    return `<p>Domicilio social: ${escapeHtml(ctx.address || '[dirección]')}, ${escapeHtml(ctx.city || '[ciudad]')}, ${escapeHtml(
      ctx.country || 'Colombia',
    )}.</p>`;
  }

  return `<p>Borrador para <strong>${company}</strong> conforme a ${escapeHtml(
    template.name,
  )}. Complete los campos entre corchetes [ ] con la información definitiva durante la revisión humana.</p>${generatePlaceholder(definition)}`;
}

function appendRegenerationNote(newContent: string, instruction: string, previousContent: string): string {
  const trimmedInstruction = (instruction || '').trim();
  const note = trimmedInstruction
    ? `<p><em>[Regenerado con instrucción del usuario: "${escapeHtml(trimmedInstruction)}".]</em></p>`
    : `<p><em>[Regenerado por el Agente Redactor Legal.]</em></p>`;
  void previousContent; // reservado para diff futuro contra el borrador previo.
  return `${newContent}${note}`;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCop(value: number): string {
  const n = Number(value) || 0;
  return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

// ---- Agente Auditor de Coherencia -----------------------------------------

function computeAuditAlerts(
  sections: readonly DocumentSection[],
  context: StartupContext,
  template: DocumentTemplate,
): AuditAlert[] {
  const alerts: AuditAlert[] = [];

  // 1) Suma de porcentajes accionarios al 100%.
  const total = totalSharePercentage(context.partners);
  if (context.partners.length === 0) {
    alerts.push({
      id: nextAlertId(),
      sectionId: null,
      severity: 'error',
      category: 'Suma de Porcentajes',
      message: 'No hay socios registrados. Agregue al menos un socio en el Paso 1.',
    });
  } else if (Math.abs(total - 100) > 0.01) {
    alerts.push({
      id: nextAlertId(),
      sectionId: null,
      severity: 'warn',
      category: 'Suma de Porcentajes',
      message: `La suma de porcentajes accionarios es ${round2(total)}%; debe ser exactamente 100%.`,
    });
  } else {
    alerts.push({
      id: nextAlertId(),
      sectionId: null,
      severity: 'success',
      category: 'Suma de Porcentajes',
      message: 'Validación de suma de porcentajes accionarios al 100% correcta.',
    });
  }

  // 2) Datos maestros obligatorios.
  const missing: string[] = [];
  if (!context.legalName.trim()) missing.push('razón social');
  if (!context.companyName.trim()) missing.push('nombre comercial');
  if (!context.nit.trim()) missing.push('NIT');
  if (!context.city.trim()) missing.push('ciudad');
  if (!context.corporatePurpose.trim()) missing.push('objeto social');
  if (context.partners.some((p) => !p.fullName.trim())) missing.push('nombre de socio');
  if (context.partners.some((p) => !p.documentNumber.trim())) missing.push('número de documento de socio');
  if (missing.length > 0) {
    alerts.push({
      id: nextAlertId(),
      sectionId: null,
      severity: 'warn',
      category: 'Datos Faltantes',
      message: `Datos maestros incompletos: ${missing.join(', ')}. Complételos en el Paso 1.`,
    });
  }

  // 3) Cumplimiento legal del catálogo (base legal colombiana).
  alerts.push({
    id: nextAlertId(),
    sectionId: null,
    severity: 'info',
    category: 'Cumplimiento Legal',
    message: `Plantilla "${template.name}". Base legal de referencia: ${template.legalBasis.join('; ')}.`,
  });

  // 4) Coherencia de secciones: vacías, pendientes o sin contenido.
  for (const section of sections) {
    if (section.status === 'PENDING_GENERATION') {
      alerts.push({
        id: nextAlertId(),
        sectionId: section.id,
        severity: 'warn',
        category: 'Coherencia',
        message: `La sección "${section.title}" está pendiente de generación.`,
      });
    } else if (!stripTags(section.content).trim()) {
      alerts.push({
        id: nextAlertId(),
        sectionId: section.id,
        severity: 'error',
        category: 'Formato',
        message: `La sección "${section.title}" no tiene contenido.`,
      });
    }
  }

  // 5) Estado de aprobación global.
  const approved = sections.filter((s) => s.status === 'APPROVED').length;
  alerts.push({
    id: nextAlertId(),
    sectionId: null,
    severity: approved === sections.length && sections.length > 0 ? 'success' : 'info',
    category: 'Coherencia',
    message:
      sections.length === 0
        ? 'No hay secciones para auditar.'
        : `${approved}/${sections.length} secciones aprobadas. El Paso 3 requiere el 100% aprobado.`,
  });

  return alerts;
}

/** Une las observaciones locales con las del modelo, sin duplicados. */
function mergeAlerts(localAlerts: readonly AuditAlert[], aiAlerts: readonly AiAuditAlert[]): AuditAlert[] {
  const merged: AuditAlert[] = [...localAlerts];
  const seen = new Set(localAlerts.map((alert) => normalizeKey(alert.category, alert.message)));

  for (const alert of aiAlerts) {
    const key = normalizeKey(alert.category, alert.message);
    if (seen.has(key)) continue;
    seen.add(key);

    merged.push({
      id: nextAlertId(),
      sectionId: alert.sectionId,
      severity: alert.severity as AuditSeverity,
      category: alert.category,
      message: alert.message,
    });
  }

  return merged.slice(0, 30);
}

function normalizeKey(category: string, message: string): string {
  return `${category}|${message}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9|]+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
