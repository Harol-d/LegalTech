/**
 * Catálogo de plantillas legales para startups en Colombia.
 */

/** Categorías del catálogo (grupos en la UI). */
export type TemplateCategory =
  | 'Constitución y Registro'
  | 'Socios e Inversión'
  | 'Operación y Protección';

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  'Constitución y Registro',
  'Socios e Inversión',
  'Operación y Protección',
] as const;

/** Definición de una sección/cláusula dentro de una plantilla. */
export interface LegalSectionDefinition {
  /** Identificador único de la sección dentro de la plantilla. */
  id: string;
  /** Título visible de la sección (español). */
  title: string;
  /** Guía/instrucción para el Agente Redactor Legal (español). */
  guidance: string;
  /** Base legal de referencia (español). */
  legalBasis?: string;
  /** Texto semilla/placeholder para la redacción. */
  seed?: string;
}

/** Plantilla legal. */
export interface DocumentTemplate {
  /** Identificador único. */
  id: string;
  /** Nombre de la plantilla (español). */
  name: string;
  category: TemplateCategory;
  /** Descripción breve (español). */
  description: string;
  /** Referencias legales colombianas aplicables. */
  legalBasis: string[];
  /** Secciones/cláusulas que se redactan y auditan. */
  sections: LegalSectionDefinition[];
}

/** Agrupación de plantillas por categoría para renderizar el catálogo. */
export interface TemplateCategoryGroup {
  category: TemplateCategory;
  templates: DocumentTemplate[];
}
