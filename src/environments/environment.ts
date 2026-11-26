/**
 * Entorno del frontend.
 *
 * La clave del modelo Google se lee con el nombre **`model`** desde `.env`.
 * Angular no inyecta `.env` automáticamente; se resuelve en `keyModel` vía
 * `process.env['model']` (SSR/build) o se fija aquí. Dejar vacío = sin IA;
 * la capa de servicios hace fallback a borradores locales.
 */
import { generatedEnvironment } from './environment.generated';

export const environment = {
  production: false,
  /** Clave `model` del modelo Google. Rellenar en `.env` o aquí. */
  keyModel:
    generatedEnvironment.keyModel ||
    (typeof process !== 'undefined' && process.env?.['model']) ||
    '',
} as const;
