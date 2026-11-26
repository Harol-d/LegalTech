import { Injectable, inject } from '@angular/core';
import { Observable, defer, firstValueFrom, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { GoogleAiService } from './google-ai.service';
import { environment } from '../../../environments/environment';

const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com';

export interface FileSearchDocument {
  /** Nombre legible del documento. */
  displayName: string;
  /** Contenido de texto a indexar (la aplicación no usa binarios). */
  text: string;
  /** MIME type (por defecto text/plain). */
  mimeType?: string;
}

/**
 * RAG con Google **File Search** (modelo Google).
 *
 * Crea stores, indexa documentos legales y consulta con grounding sobre el
 * corpus. Todas las funciones devuelven `Observable<T>` (RxJS) y pasan por la
 * capa de servicios; los componentes no llaman a Google directamente.
 */
@Injectable({ providedIn: 'root' })
export class FileSearchService {
  private readonly ai = inject(GoogleAiService);

  /** Store activo para RAG (nombre completo `fileSearchStores/...`). */
  private activeStoreName: string | null = null;

  /** Clave `key-Model`. */
  private get apiKey(): string {
    return this.ai.apiKey;
  }

  /** ¿RAG disponible? (clave `key-Model` + store activo). */
  hasRagStore(): boolean {
    return this.activeStoreName !== null && this.apiKey.length > 0;
  }

  /** Nombre del store activo o null. */
  getActiveStoreName(): string | null {
    return this.activeStoreName;
  }

  /** Fija el store de File Search a usar en las consultas RAG. */
  setActiveStore(storeName: string | null): void {
    this.activeStoreName = storeName;
  }

  /**
   * Crea un File Search store.
   * @returns nombre completo del store (`fileSearchStores/{id}`).
   */
  createFileSearchStore(displayName: string): Observable<string> {
    return this.request<{ name?: string }>('POST', `${GOOGLE_AI_BASE_URL}/v1beta/fileSearchStores`, { displayName }).pipe(
      map((res) => res.name ?? ''),
      // No hace fallar el flujo si el store no puede crearse: RAG es opcional.
      catchError(() => of('')),
    );
  }

  /**
   * Indexa un documento de texto en un store.
   * @returns nombre del documento creado.
   */
  uploadDocument(storeName: string, document: FileSearchDocument): Observable<string> {
    if (!storeName) {
      return of('');
    }
    const body = {
      displayName: document.displayName,
      mimeType: document.mimeType ?? 'text/plain',
      content: document.text,
    };
    return this.request<{ name?: string; document?: { name?: string } }>(
      'POST',
      `${GOOGLE_AI_BASE_URL}/v1beta/${storeName}/documents`,
      body,
    ).pipe(
      map((res) => res.name ?? res.document?.name ?? ''),
      catchError(() => of('')),
    );
  }

  /**
   * Consulta con grounding RAG sobre el store (Google File Search tool).
   * @returns respuesta anclada al corpus indexado.
   */
  query(storeName: string, query: string): Observable<string> {
    const name = storeName || this.activeStoreName || '';
    return this.ai.generateText(query, { fileSearchStoreNames: name ? [name] : [] });
  }

  /** Asegura store + índice conocimiento legal; fija el store activo. */
  ensureStoreWithDocuments(displayName: string, documents: FileSearchDocument[]): Observable<string> {
    if (!this.apiKey) {
      return of('');
    }
    return defer(() => {
      return from(
        (async () => {
          const storeName = await firstValueFrom(this.createFileSearchStore(displayName));
          if (!storeName) {
            return '';
          }
          await Promise.all(documents.map((d) => firstValueFrom(this.uploadDocument(storeName, d))));
          this.activeStoreName = storeName;
          return storeName;
        })(),
      );
    }).pipe(catchError(() => of('')));
  }

  private request<T>(method: string, url: string, body?: unknown): Observable<T> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      return of({} as T);
    }
    return defer(() =>
      from(
        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: body ? JSON.stringify(body) : undefined,
        }).then(async (res) => {
          const data = (await res.json().catch(() => ({}))) as T;
          if (!res.ok) {
            throw new Error(`Google File Search HTTP ${res.status}`);
          }
          return data;
        }),
      ),
    );
  }
}

// Re-exportar el entorno para consumidores que necesiten la clave `key-Model`.
export const KEY_MODEL_ENV_NAME = 'key-Model' as const;
export const keyModelConfigured = (): boolean => Boolean(environment.keyModel?.trim());
