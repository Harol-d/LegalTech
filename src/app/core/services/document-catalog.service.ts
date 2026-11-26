import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { LEGAL_TEMPLATES } from '../data/legal-templates';
import {
  DocumentTemplate,
  TemplateCategory,
  TemplateCategoryGroup,
  TEMPLATE_CATEGORIES,
} from '../models/document-template.model';

/** Latencia simulada de red (ms) para ejercitar estados de carga. */
export const MOCK_NETWORK_LATENCY_MS = 600;

/**
 * Catálogo de plantillas legales.
 *
 * Release 1: datos simulados (mocked). Los métodos devuelven `Observable<T>`
 * con tipado estricto y latencia simulada; listos para conectar endpoints HTTP
 * reales sin modificar los componentes.
 */
@Injectable({ providedIn: 'root' })
export class DocumentCatalogService {
  private readonly templates: readonly DocumentTemplate[] = LEGAL_TEMPLATES;

  /** Todas las plantillas. */
  getTemplates(): Observable<DocumentTemplate[]> {
    return of(this.templates.map((template) => this.clone(template))).pipe(delay(MOCK_NETWORK_LATENCY_MS));
  }

  /** Una plantilla por id. */
  getTemplateById(id: string): Observable<DocumentTemplate | undefined> {
    const found = this.templates.find((template) => template.id === id);
    return of(found ? this.clone(found) : undefined).pipe(delay(MOCK_NETWORK_LATENCY_MS));
  }

  /** Plantillas agrupadas por categoría (orden de TEMPLATE_CATEGORIES). */
  getTemplatesByCategory(): Observable<TemplateCategoryGroup[]> {
    return this.getTemplates().pipe(map((templates) => this.groupByCategory(templates)));
  }

  /** Plantillas de una categoría. */
  getTemplatesInCategory(category: TemplateCategory): Observable<DocumentTemplate[]> {
    return this.getTemplates().pipe(map((templates) => templates.filter((t) => t.category === category)));
  }

  /** Lista de categorías disponibles. */
  getCategories(): Observable<TemplateCategory[]> {
    return of([...TEMPLATE_CATEGORIES]).pipe(delay(MOCK_NETWORK_LATENCY_MS));
  }

  private groupByCategory(templates: DocumentTemplate[]): TemplateCategoryGroup[] {
    return TEMPLATE_CATEGORIES.map((category) => ({
      category,
      templates: templates.filter((template) => template.category === category),
    })).filter((group) => group.templates.length > 0);
  }

  private clone(template: DocumentTemplate): DocumentTemplate {
    return {
      ...template,
      legalBasis: [...template.legalBasis],
      sections: template.sections.map((section) => ({ ...section })),
    };
  }
}
