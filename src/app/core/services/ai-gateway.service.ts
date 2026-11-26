import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';

import type {
  AiErrorResponse,
  AiStatus,
  AuditResponse,
  DocumentDraftResponse,
  KnowledgeBaseStatus,
  SectionDraftResponse,
} from '../models/ai.model';
import type { DocumentSection } from '../models/agent-workflow.model';
import type { StartupContext } from '../models/startup-context.model';

/** Tiempo máximo de espera de una respuesta de IA (ms). */
export const AI_CLIENT_TIMEOUT_MS = 180_000;

export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly code: AiErrorResponse['error'] | null,
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}

/**
 * Puerta de entrada HTTP a la capa de IA del servidor SSR (`/api/ai/*`).
 *
 * Único punto del cliente que conoce las rutas de IA: los componentes nunca
 * llaman a Google directamente y la clave `model` permanece en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class AiGatewayService {
  /**
   * `HttpClient` es opcional para permitir pruebas aisladas. Sin él, la
   * solicitud falla explícitamente; nunca se sustituye por un borrador local.
   */
  private readonly http = inject(HttpClient, { optional: true });

  private readonly baseUrl = '/api/ai';

  /** Estado de la IA y del corpus legal. */
  getStatus(): Observable<AiStatus> {
    return this.request<AiStatus>('GET', `${this.baseUrl}/status`);
  }

  /** Reindexa el corpus legal en el File Search Store. */
  indexKnowledgeBase(): Observable<KnowledgeBaseStatus> {
    return this.request<KnowledgeBaseStatus>('POST', `${this.baseUrl}/knowledge-base/index`, {});
  }

  /** Obtiene la lista de modelos de Google disponibles. */
  getAvailableModels(): Observable<{ currentModel: string; configuredModel: string; models: import('../models/ai.model').AvailableModelItem[] }> {
    return this.request<{ currentModel: string; configuredModel: string; models: import('../models/ai.model').AvailableModelItem[] }>('GET', `${this.baseUrl}/models`);
  }

  /** Cambia el modelo de Google a utilizar. */
  setModel(model: string): Observable<{ success: boolean; model: string; activeModel: string; message: string }> {
    return this.request<{ success: boolean; model: string; activeModel: string; message: string }>('POST', `${this.baseUrl}/model`, { model });
  }

  /** Redacta todas las cláusulas del documento en una sola llamada. */
  draftDocument(templateId: string, context: StartupContext): Observable<DocumentDraftResponse> {
    return this.request<DocumentDraftResponse>('POST', `${this.baseUrl}/draft-document`, {
      templateId,
      context,
    });
  }

  /** Redacta una cláusula concreta. */
  draftSection(
    templateId: string,
    context: StartupContext,
    sectionId: string,
  ): Observable<SectionDraftResponse> {
    return this.request<SectionDraftResponse>('POST', `${this.baseUrl}/draft-section`, {
      templateId,
      context,
      sectionId,
    });
  }

  /** Regenera una cláusula con la instrucción del revisor humano (HITL). */
  regenerateSection(
    templateId: string,
    context: StartupContext,
    sectionId: string,
    previousContent: string,
    instruction: string,
  ): Observable<SectionDraftResponse> {
    return this.request<SectionDraftResponse>('POST', `${this.baseUrl}/regenerate-section`, {
      templateId,
      context,
      sectionId,
      previousContent,
      instruction,
    });
  }

  /** Audita la coherencia y el cumplimiento legal del borrador. */
  audit(
    templateId: string,
    context: StartupContext,
    sections: readonly DocumentSection[],
  ): Observable<AuditResponse> {
    return this.request<AuditResponse>('POST', `${this.baseUrl}/audit`, {
      templateId,
      context,
      sections,
    });
  }

  // -------------------------------------------------------------------------

  private request<T>(method: 'GET' | 'POST', url: string, body?: unknown): Observable<T> {
    const http = this.http;

    if (!http) {
      return throwError(
        () => new AiGatewayError('HttpClient no está disponible en este contexto.', 'AI_NOT_CONFIGURED'),
      );
    }

    const request$ =
      method === 'GET' ? http.get<T>(url) : http.post<T>(url, body ?? {});

    return request$.pipe(
      timeout(AI_CLIENT_TIMEOUT_MS),
      catchError((error: unknown) => throwError(() => toAiError(error))),
    );
  }
}

/** Normaliza el error HTTP en un `Error` con mensaje en español. */
function toAiError(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error as Partial<AiErrorResponse> | null;
    const code = payload?.error ?? null;
    const message =
      (typeof payload?.message === 'string' && payload.message) ||
      (error.status === 0
        ? 'No se pudo contactar el servidor de IA.'
        : `Error ${error.status} al invocar la IA.`);
    return new AiGatewayError(message, code);
  }

  if (error instanceof Error) return error;
  return new Error(String(error));
}
