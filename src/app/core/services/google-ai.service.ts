import { Injectable } from '@angular/core';
import { Observable, defer, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

/** Modelo de IA exclusivo: Google (Gemini). */
export const GOOGLE_AI_MODEL = 'gemini-2.5-flash';

const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface GoogleGenerateOptions {
  /** Instrucción de sistema (rol/formato del agente). */
  systemInstruction?: string;
  /** Si es true, se pide salida JSON (`responseMimeType: application/json`). */
  json?: boolean;
  /** Stores de Google File Search para grounding RAG. */
  fileSearchStoreNames?: string[];
  /** Número máximo de resultados RAG por store. */
  fileSearchMaxResults?: number;
  /** Clave de API (si no se indica, usa `environment.keyModel` / `model`). */
  apiKey?: string;
}

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

/**
 * Capa de servicio para el modelo Google (Gemini).
 *
 * Todas las funciones de IA de la aplicación pasan por esta capa; ningún
 * componente llama al modelo directamente. Devuelve `Observable<T>` (RxJS)
 * y lee la clave de API `model` desde `.env` -> `environment.keyModel`.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAiService {
  /** Modelo utilizado. Únicamente Google. */
  readonly model = GOOGLE_AI_MODEL;

  /** Clave `model` (nombre exacto solicitado en `.env`). */
  get apiKey(): string {
    const fromProcess =
      typeof process !== 'undefined' ? (process.env?.['model'] ?? '') : '';
    return (environment.keyModel || fromProcess || '').trim();
  }

  /** ¿Hay clave `model` configurada para llamar al modelo Google? */
  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  /** Genera texto. */
  generateText(prompt: string, options: GoogleGenerateOptions = {}): Observable<string> {
    return this.generateContent(prompt, options).pipe(map((parts) => parts.join('')));
  }

  /** Genera y parsea JSON tipado. */
  generateJson<T>(prompt: string, options: Omit<GoogleGenerateOptions, 'json'> = {}): Observable<T> {
    return this.generateContent(prompt, { ...options, json: true }).pipe(
      map((parts) => parseJsonSafe<T>(parts.join(''))),
    );
  }

  private generateContent(prompt: string, options: GoogleGenerateOptions): Observable<string[]> {
    const apiKey = (options.apiKey ?? this.apiKey).trim();
    if (!apiKey) {
      return throwError(() => new Error('model no configurada: define model en .env / environment.keyModel.'));
    }

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: options.json ? { responseMimeType: 'application/json' } : {},
    };
    if (options.systemInstruction) {
      body['systemInstruction'] = { parts: [{ text: options.systemInstruction }] };
    }
    if (options.fileSearchStoreNames?.length) {
      body['tools'] = [
        {
          fileSearch: {
            fileSearchStoreNames: options.fileSearchStoreNames,
            ...(options.fileSearchMaxResults ? { maxResults: options.fileSearchMaxResults } : {}),
          },
        },
      ];
    }

    const url = `${GOOGLE_AI_BASE_URL}/models/${this.model}:generateContent`;

    return defer(() =>
      from(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        }).then(async (res) => {
          const data = (await res.json().catch(() => ({}))) as GenerateContentResponse;
          if (!res.ok) {
            throw new Error(data.error?.message ?? `Error Google AI (HTTP ${res.status}).`);
          }
          const parts = data.candidates?.[0]?.content?.parts ?? [];
          return parts.map((p) => p.text ?? '').filter((t) => t.length > 0);
        }),
      ),
    ).pipe(catchError((err) => throwError(() => err instanceof Error ? err : new Error(String(err)))));
  }
}

function parseJsonSafe<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
