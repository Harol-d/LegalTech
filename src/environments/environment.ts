/**
 * Entorno del frontend.
 *
 * La clave del modelo Google se lee con el nombre **`key-Model`** desde `.env`.
 * Angular no inyecta `.env` automáticamente; se resuelve en `keyModel` vía
 * `process.env['key-Model']` (SSR/build) o se fija aquí. Dejar vacío = sin IA;
 * la capa de servicios hace fallback a borradores locales.
 */
import { generatedEnvironment } from './environment.generated';

export const environment = {
  production: false,
  /** Clave `key-Model` del modelo Google. Rellenar en `.env` o aquí. */
  keyModel:
    generatedEnvironment.keyModel ||
    (typeof process !== 'undefined' && process.env?.['key-Model']) ||
    '',
} as const;
