import { Type } from '@google/genai';
import type { Schema } from '@google/genai';

import type { DocumentSection } from '../app/core/models/agent-workflow.model';
import type { DocumentTemplate, LegalSectionDefinition } from '../app/core/models/document-template.model';
import type { StartupContext } from '../app/core/models/startup-context.model';

/**
 * Prompts y esquemas de salida de los agentes (español, contexto colombiano).
 * Toda la lógica de redacción vive en el servidor: los componentes solo
 * consumen los Observables de los servicios.
 */

const MAX_SECTION_CHARS = 1_400;

export const DRAFTER_SYSTEM_INSTRUCTION = `Eres un abogado colombiano senior especializado en derecho societario, contractual y de protección de datos, con amplia experiencia asesorando startups constituidas como SAS en Colombia.

Redactas cláusulas de documentos legales en español jurídico colombiano: formal, preciso y directamente utilizable.

Reglas obligatorias:
1. Fundamenta cada cláusula con la herramienta de búsqueda de archivos (corpus legal del estudio). Si el corpus no cubre un punto, redacta con base en la normativa colombiana indicada en la ficha de la plantilla.
2. No inventes números de leyes, artículos, decretos, resoluciones ni jurisprudencia. Cita únicamente normas que aparezcan en el contexto o en las fuentes recuperadas.
3. Usa los datos de la startup (razón social, NIT, socios, capital, domicilio, objeto social) de forma consistente en todas las cláusulas.
4. Si falta un dato indispensable, escribe un marcador con el formato [DATO PENDIENTE: descripción].
5. Devuelve únicamente HTML simple: <h3>, <p>, <ol>, <ul>, <li>, <strong>, <em>. Sin <html>, <head>, <body>, <style>, <script>, sin clases ni estilos en línea.
6. No incluyas explicaciones, avisos ni comentarios fuera del HTML de la cláusula.
7. Extensión habitual: entre 80 y 220 palabras por cláusula, salvo que la guía indique otra cosa.
8. Nunca afirmes que el documento está listo para firma: es un borrador sujeto a revisión humana.`;

export const AUDITOR_SYSTEM_INSTRUCTION = `Eres el Agente Auditor de Coherencia de un estudio jurídico colombiano. Revisas borradores de documentos legales para startups y detectas inconsistencias, datos faltantes, cláusulas vacías y riesgos de incumplimiento normativo colombiano.

Reglas:
1. Sé concreto y breve: máximo 220 caracteres por observación.
2. Severidades: 'error' (bloquea la aprobación), 'warn' (requiere corrección), 'info' (recomendación), 'success' (validación correcta).
3. Categorías permitidas: 'Coherencia', 'Cumplimiento Legal', 'Suma de Porcentajes', 'Datos Faltantes', 'Formato'.
4. Verifica la coherencia entre las cláusulas y los datos maestros de la startup.
5. Usa la búsqueda de archivos para verificar la base legal citada.
6. No repitas observaciones equivalentes. Máximo 12 observaciones.
7. Escribe siempre en español y no inventes normas.`;

export const DOCUMENT_DRAFT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['id', 'title', 'content'],
      },
    },
  },
  required: ['sections'],
};

export const SECTION_DRAFT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    content: { type: Type.STRING },
  },
  required: ['id', 'title', 'content'],
};

export const AUDIT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    alerts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionId: { type: Type.STRING, nullable: true },
          severity: {
            type: Type.STRING,
            format: 'enum',
            enum: ['success', 'info', 'warn', 'error'],
          },
          category: {
            type: Type.STRING,
            format: 'enum',
            enum: [
              'Coherencia',
              'Cumplimiento Legal',
              'Suma de Porcentajes',
              'Datos Faltantes',
              'Formato',
            ],
          },
          message: { type: Type.STRING },
        },
        required: ['severity', 'category', 'message'],
      },
    },
  },
  required: ['alerts'],
};

/** Bloque de plantilla reutilizado por los prompts. */
function templateBlock(template: DocumentTemplate): string {
  const lines = [
    `- Nombre: ${template.name}`,
    `- Categoría: ${template.category}`,
    `- Descripción: ${template.description}`,
    `- Base legal: ${template.legalBasis.join('; ')}`,
  ];
  return lines.join('\n');
}

/** Bloque de una cláusula solicitada. */
function sectionBlock(section: LegalSectionDefinition, index?: number): string {
  const prefix = index === undefined ? '- id' : `${index + 1}. id`;
  const lines = [
    `${prefix}: \`${section.id}\``,
    `   Título: ${section.title}`,
    `   Guía de redacción: ${section.guidance || 'Redactar la cláusula conforme a la base legal.'}`,
  ];
  if (section.legalBasis) lines.push(`   Base legal: ${section.legalBasis}`);
  if (section.seed) lines.push(`   Texto de referencia: ${section.seed}`);
  return lines.join('\n');
}

/** Datos maestros de la startup en texto legible para el modelo. */
export function startupContextBlock(context: StartupContext): string {
  const partners = context.partners
    .map(
      (partner, index) =>
        `  ${index + 1}. ${partner.fullName || '[DATO PENDIENTE: nombre del socio]'} — ${
          partner.entityType
        } — ${partner.documentType} ${partner.documentNumber || '[sin documento]'} — rol: ${
          partner.role
        } — participación: ${partner.sharePercentage}% — correo: ${partner.email || 'no informado'} — teléfono: ${
          partner.phone || 'no informado'
        }`,
    )
    .join('\n');

  return [
    `- Nombre comercial: ${context.companyName || '[DATO PENDIENTE]'}`,
    `- Razón social: ${context.legalName || '[DATO PENDIENTE]'}`,
    `- NIT: ${context.nit || '[DATO PENDIENTE]'}`,
    `- Tipo societario: ${context.legalType}`,
    `- Domicilio: ${context.address || '[DATO PENDIENTE]'}, ${context.city || '[DATO PENDIENTE]'}, ${context.country}`,
    `- Objeto social: ${context.corporatePurpose || '[DATO PENDIENTE]'}`,
    `- Capital social: ${context.capitalSocial} COP`,
    `- Número de acciones: ${context.numberOfShares}`,
    `- Valor nominal por acción: ${context.shareNominalValue} COP`,
    `- Correo corporativo: ${context.corporateEmail || 'no informado'}`,
    '',
    'Socios:',
    partners || '  (sin socios registrados)',
  ].join('\n');
}

/** Prompt para redactar el documento completo en una sola llamada. */
export function buildDocumentDraftPrompt(template: DocumentTemplate, context: StartupContext): string {
  const sections = template.sections.map((section, index) => sectionBlock(section, index)).join('\n\n');

  return `Redacta TODAS las cláusulas del siguiente documento legal.

## Plantilla
${templateBlock(template)}

## Datos maestros de la startup
${startupContextBlock(context)}

## Cláusulas solicitadas (en este orden)
${sections}

## Salida
Devuelve un objeto JSON con la propiedad "sections": un elemento por cada cláusula solicitada, conservando exactamente el mismo "id" y "title", con el HTML de la cláusula en "content". No omitas ninguna cláusula ni agregues cláusulas adicionales.`;
}

/** Prompt para redactar una sola cláusula. */
export function buildSectionDraftPrompt(
  template: DocumentTemplate,
  context: StartupContext,
  section: LegalSectionDefinition,
): string {
  return `Redacta una única cláusula de un documento legal.

## Plantilla
${templateBlock(template)}

## Datos maestros de la startup
${startupContextBlock(context)}

## Cláusula solicitada
${sectionBlock(section)}

## Salida
Devuelve un objeto JSON con "id" (\`${section.id}\`), "title" y "content" (HTML de la cláusula).`;
}

/** Prompt para regenerar una cláusula con una instrucción del usuario (HITL). */
export function buildRegenerationPrompt(
  template: DocumentTemplate,
  context: StartupContext,
  section: LegalSectionDefinition,
  previousContent: string,
  instruction: string,
): string {
  return `Regenera una cláusula de un documento legal atendiendo la instrucción del revisor humano.

## Plantilla
${templateBlock(template)}

## Datos maestros de la startup
${startupContextBlock(context)}

## Cláusula a regenerar
${sectionBlock(section)}

## Versión actual (borrador previo)
${truncate(stripHtml(previousContent)) || '(vacía)'}

## Instrucción del revisor humano
${instruction.trim() || 'Mejorar la precisión jurídica y la claridad de la cláusula.'}

## Salida
Devuelve un objeto JSON con "id" (\`${section.id}\`), "title" y "content" (HTML de la cláusula regenerada). Mantén el resto del documento intacto.`;
}

/** Prompt para el Agente Auditor de Coherencia. */
export function buildAuditPrompt(
  template: DocumentTemplate,
  context: StartupContext,
  sections: readonly DocumentSection[],
): string {
  const sectionList = sections
    .map(
      (section) =>
        `### ${section.title} [id: ${section.id}] (estado: ${section.status})\n${truncate(stripHtml(section.content)) || '(sin contenido)'}`,
    )
    .join('\n\n');

  return `Audita la coherencia y el cumplimiento legal del siguiente borrador.

## Plantilla
${templateBlock(template)}

## Datos maestros de la startup
${startupContextBlock(context)}

## Cláusulas del borrador
${sectionList || '(sin cláusulas)'}

## Salida
Devuelve un objeto JSON con la propiedad "alerts": observaciones concretas y accionables. Usa "sectionId" con el id de la cláusula afectada o null si la observación es global.`;
}

/** Texto plano a partir del HTML del editor. */
export function stripHtml(html: string): string {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h[1-6]|div|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(value: string): string {
  if (value.length <= MAX_SECTION_CHARS) return value;
  return `${value.slice(0, MAX_SECTION_CHARS)}…`;
}
