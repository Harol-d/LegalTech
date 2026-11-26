import { Router } from 'express';
import type { Request, Response } from 'express';

import { LEGAL_TEMPLATES } from '../app/core/data/legal-templates';
import type { DocumentSection } from '../app/core/models/agent-workflow.model';
import type {
  AiAuditAlert,
  AiMode,
  AuditResponse,
  DocumentDraftResponse,
  SectionDraftResponse,
} from '../app/core/models/ai.model';
import type { DocumentTemplate, LegalSectionDefinition } from '../app/core/models/document-template.model';
import type { StartupContext } from '../app/core/models/startup-context.model';
import {
  AiNotConfiguredError,
  generateStructured,
  getActiveGeminiModel,
  getGeminiModel,
  isAiEnabled,
  isModelBusyError,
  isModelQuotaError,
  listAvailableModels,
  setSelectedGeminiModel,
} from './gemini.client';
import {
  ensureKnowledgeBaseIndexed,
  getCachedStatus,
  resolveRagStoreNames,
} from './legal-knowledge-base';
import {
  AUDITOR_SYSTEM_INSTRUCTION,
  AUDIT_SCHEMA,
  DRAFTER_SYSTEM_INSTRUCTION,
  DOCUMENT_DRAFT_SCHEMA,
  SECTION_DRAFT_SCHEMA,
  buildAuditPrompt,
  buildDocumentDraftPrompt,
  buildRegenerationPrompt,
  buildSectionDraftPrompt,
} from './prompts';

/** Error de petición inválida. */
class BadRequestError extends Error {
  readonly status = 400;
  readonly code = 'INVALID_REQUEST';

  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/** Error de recurso inexistente. */
class NotFoundError extends Error {
  readonly status = 404;
  readonly code = 'NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

interface GeneratedSection {
  id?: string;
  title?: string;
  content?: string;
}

/**
 * Router `/api/ai`: única puerta de entrada a Google Gemini.
 * La clave (`key-Model`) nunca sale del servidor.
 */
export function createAiRouter(): Router {
  const router = Router();

  router.get(
    '/status',
    handle(async (_req: Request, res: Response) => {
      const knowledgeBase = getCachedStatus();
      const enabled = isAiEnabled();
      const mode: AiMode = !enabled
        ? 'local-fallback'
        : knowledgeBase.storeName
          ? 'gemini-file-search'
          : 'gemini';

      const availableModels = await listAvailableModels();

      res.json({
        enabled,
        model: getActiveGeminiModel(),
        configuredModel: getGeminiModel(),
        mode,
        storeName: knowledgeBase.storeName,
        indexedDocuments: knowledgeBase.indexedDocuments,
        corpusVersion: knowledgeBase.corpusVersion,
        availableModels,
        message: enabled
          ? 'IA de Google habilitada.'
          : 'Configure la variable key-Model en el archivo .env para habilitar la IA real. Se usarán borradores de demostración.',
      });
    }),
  );

  router.get(
    '/models',
    handle(async (_req: Request, res: Response) => {
      const models = await listAvailableModels();
      res.json({
        currentModel: getActiveGeminiModel(),
        configuredModel: getGeminiModel(),
        models,
      });
    }),
  );

  router.post(
    '/model',
    handle(async (req: Request, res: Response) => {
      const model = req.body?.model;
      if (!model || typeof model !== 'string') {
        throw new BadRequestError('El parámetro "model" es obligatorio y debe ser una cadena de texto.');
      }
      setSelectedGeminiModel(model.trim());
      res.json({
        success: true,
        model: getGeminiModel(),
        activeModel: getActiveGeminiModel(),
        message: `Modelo seleccionado exitosamente: ${getGeminiModel()}`,
      });
    }),
  );

  router.post(
    '/knowledge-base/index',
    handle(async (_req, res) => {
      const status = await ensureKnowledgeBaseIndexed(true);
      res.json({ ...status, mode: status.storeName ? 'gemini-file-search' : 'gemini' });
    }),
  );

  router.post(
    '/draft-document',
    handle(async (req, res) => {
      const template = requireTemplate(req.body?.templateId);
      const context = requireContext(req.body?.context);
      const storeNames = await resolveRagStoreNames();
      const mode: AiMode = storeNames.length > 0 ? 'gemini-file-search' : 'gemini';

      const result = await generateStructured<{ sections?: GeneratedSection[] }>({
        systemInstruction: DRAFTER_SYSTEM_INSTRUCTION,
        prompt: buildDocumentDraftPrompt(template, context),
        schema: DOCUMENT_DRAFT_SCHEMA,
        fileSearchStoreNames: storeNames,
        maxOutputTokens: 16384,
      });

      const generated = result.data?.sections ?? [];
      if (!result.data && template.sections.length > 1) {
        throw new Error('El modelo no devolvió el JSON estructurado esperado.');
      }

      const sections = template.sections.map((definition) =>
        buildSection(definition, pickGenerated(generated, definition)?.content ?? '', result.text),
      );

      const response: DocumentDraftResponse = {
        sections,
        citations: result.citations,
        mode,
      };
      res.json(response);
    }),
  );

  router.post(
    '/draft-section',
    handle(async (req, res) => {
      const template = requireTemplate(req.body?.templateId);
      const context = requireContext(req.body?.context);
      const definition = requireSectionDefinition(template, req.body?.sectionId);
      const storeNames = await resolveRagStoreNames();
      const mode: AiMode = storeNames.length > 0 ? 'gemini-file-search' : 'gemini';

      const result = await generateStructured<GeneratedSection>({
        systemInstruction: DRAFTER_SYSTEM_INSTRUCTION,
        prompt: buildSectionDraftPrompt(template, context, definition),
        schema: SECTION_DRAFT_SCHEMA,
        fileSearchStoreNames: storeNames,
      });

      const section = buildSection(definition, result.data?.content ?? result.text, '');

      const response: SectionDraftResponse = { section, citations: result.citations, mode };
      res.json(response);
    }),
  );

  router.post(
    '/regenerate-section',
    handle(async (req, res) => {
      const template = requireTemplate(req.body?.templateId);
      const context = requireContext(req.body?.context);
      const definition = requireSectionDefinition(template, req.body?.sectionId);
      const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction : '';
      const previousContent = typeof req.body?.previousContent === 'string' ? req.body.previousContent : '';
      const storeNames = await resolveRagStoreNames();
      const mode: AiMode = storeNames.length > 0 ? 'gemini-file-search' : 'gemini';

      const result = await generateStructured<GeneratedSection>({
        systemInstruction: DRAFTER_SYSTEM_INSTRUCTION,
        prompt: buildRegenerationPrompt(template, context, definition, previousContent, instruction),
        schema: SECTION_DRAFT_SCHEMA,
        fileSearchStoreNames: storeNames,
        temperature: 0.4,
      });

      const section = buildSection(definition, result.data?.content ?? result.text, '');

      const response: SectionDraftResponse = { section, citations: result.citations, mode };
      res.json(response);
    }),
  );

  router.post(
    '/audit',
    handle(async (req, res) => {
      const template = requireTemplate(req.body?.templateId);
      const context = requireContext(req.body?.context);
      const sections = requireSections(req.body?.sections);
      const storeNames = await resolveRagStoreNames();
      const mode: AiMode = storeNames.length > 0 ? 'gemini-file-search' : 'gemini';

      const result = await generateStructured<{ alerts?: AiAuditAlert[] }>({
        systemInstruction: AUDITOR_SYSTEM_INSTRUCTION,
        prompt: buildAuditPrompt(template, context, sections),
        schema: AUDIT_SCHEMA,
        fileSearchStoreNames: storeNames,
        temperature: 0.2,
        maxOutputTokens: 4096,
      });

      const alerts = (result.data?.alerts ?? [])
        .filter((alert) => alert && typeof alert.message === 'string')
        .map((alert) => normalizeAlert(alert))
        .slice(0, 12);

      if (result.data === null) {
        console.warn('[ai] Auditoría sin JSON parseable. Texto recibido:', result.text.slice(0, 600));
      }

      const response: AuditResponse = { alerts, mode };
      res.json(response);
    }),
  );

  return router;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function handle(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    handler(req, res).catch((error: unknown) => sendError(res, error));
  };
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof AiNotConfiguredError) {
    res.status(503).json({ error: 'AI_NOT_CONFIGURED', message: error.message });
    return;
  }

  if (error instanceof BadRequestError) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: error.message });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({ error: 'NOT_FOUND', message: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error('[ai] Error al invocar Gemini:', message);

  if (isModelQuotaError(error)) {
    res.status(429).json({
      error: 'AI_QUOTA_LIMIT',
      message: 'Se alcanzó el límite de cuota del modelo de Google. Intente nuevamente más tarde.',
    });
    return;
  }

  if (isModelBusyError(error)) {
    res.status(503).json({
      error: 'AI_ERROR',
      message:
        'Los modelos de Google están saturados en este momento. Intente nuevamente en unos minutos.',
    });
    return;
  }

  res.status(502).json({
    error: 'AI_ERROR',
    message:
      'El modelo de Google no pudo completar la solicitud. Intente nuevamente o revise la clave key-Model.',
  });
}

function requireTemplate(templateId: unknown): DocumentTemplate {
  if (typeof templateId !== 'string' || !templateId.trim()) {
    throw new BadRequestError('Falta el identificador de la plantilla (templateId).');
  }

  const template = LEGAL_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new NotFoundError(`No existe la plantilla "${templateId}".`);
  }
  return template;
}

function requireContext(value: unknown): StartupContext {
  if (!value || typeof value !== 'object') {
    throw new BadRequestError('Faltan los datos maestros de la startup (context).');
  }

  const context = value as Partial<StartupContext>;
  if (typeof context.legalName !== 'string' && typeof context.companyName !== 'string') {
    throw new BadRequestError('El contexto debe incluir al menos la razón social o el nombre comercial.');
  }

  const partners = Array.isArray(context.partners) ? context.partners : [];

  return {
    companyName: asString(context.companyName),
    legalName: asString(context.legalName),
    nit: asString(context.nit),
    legalType: 'Sociedad por Acciones Simplificada (SAS)',
    country: asString(context.country) || 'Colombia',
    city: asString(context.city),
    address: asString(context.address),
    corporatePurpose: asString(context.corporatePurpose),
    capitalSocial: asNumber(context.capitalSocial),
    numberOfShares: asNumber(context.numberOfShares),
    shareNominalValue: asNumber(context.shareNominalValue),
    corporateEmail: asString(context.corporateEmail),
    partners: partners.map((partner) => ({
      id: asString(partner?.id),
      fullName: asString(partner?.fullName),
      entityType: partner?.entityType === 'Persona Jurídica' ? 'Persona Jurídica' : 'Persona Natural',
      documentType: (partner?.documentType ?? 'Cédula de Ciudadanía') as StartupContext['partners'][number]['documentType'],
      documentNumber: asString(partner?.documentNumber),
      role: (partner?.role ?? 'Socio de Capital') as StartupContext['partners'][number]['role'],
      sharePercentage: asNumber(partner?.sharePercentage),
      email: asString(partner?.email),
      phone: asString(partner?.phone),
    })),
  };
}

function requireSectionDefinition(template: DocumentTemplate, sectionId: unknown): LegalSectionDefinition {
  if (typeof sectionId !== 'string' || !sectionId.trim()) {
    throw new BadRequestError('Falta el identificador de la cláusula (sectionId).');
  }

  const definition = template.sections.find((candidate) => candidate.id === sectionId);
  if (!definition) {
    throw new NotFoundError(`La cláusula "${sectionId}" no pertenece a la plantilla seleccionada.`);
  }
  return definition;
}

function requireSections(value: unknown): DocumentSection[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestError('Se requiere al menos una cláusula para auditar.');
  }

  return value.slice(0, 60).map((item, index) => ({
    id: asString(item?.id) || `section-${index}`,
    templateSectionId: asString(item?.templateSectionId),
    title: asString(item?.title) || `Cláusula ${index + 1}`,
    content: asString(item?.content),
    status: (item?.status ?? 'DRAFT_READY') as DocumentSection['status'],
    updatedAt: asString(item?.updatedAt) || new Date().toISOString(),
  }));
}

function buildSection(
  definition: LegalSectionDefinition,
  rawContent: string,
  fallbackContent: string,
): SectionDraftResponse['section'] {
  const content =
    sanitizeHtml(rawContent) ||
    sanitizeHtml(fallbackContent) ||
    `<h3>${escapeHtml(definition.title)}</h3><p>[DATO PENDIENTE: el modelo no devolvió contenido para esta cláusula. Regenérela o redáctela manualmente.]</p>`;

  return {
    id: `section-${definition.id}`,
    templateSectionId: definition.id,
    title: definition.title,
    content,
    status: 'DRAFT_READY',
    updatedAt: new Date().toISOString(),
  };
}

function pickGenerated(generated: GeneratedSection[], definition: LegalSectionDefinition): GeneratedSection | undefined {
  const normalize = (value: string | undefined): string => (value ?? '').trim().toLowerCase();
  const targetId = normalize(definition.id);
  const targetTitle = normalize(definition.title);

  return generated.find(
    (item) => normalize(item.id) === targetId || normalize(item.title) === targetTitle,
  );
}

function normalizeAlert(alert: AiAuditAlert): AiAuditAlert {
  const allowedCategories: AiAuditAlert['category'][] = [
    'Coherencia',
    'Cumplimiento Legal',
    'Suma de Porcentajes',
    'Datos Faltantes',
    'Formato',
  ];
  const allowedSeverities: AiAuditAlert['severity'][] = ['success', 'info', 'warn', 'error'];

  return {
    sectionId: typeof alert.sectionId === 'string' && alert.sectionId.trim() ? alert.sectionId : null,
    severity: allowedSeverities.includes(alert.severity) ? alert.severity : 'info',
    category: allowedCategories.includes(alert.category) ? alert.category : 'Coherencia',
    message: String(alert.message).slice(0, 400),
  };
}

/** Saneo del HTML devuelto por el modelo (defensa en profundidad). */
function sanitizeHtml(html: string): string {
  return (html ?? '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
