/**
 * Entorno del frontend.
 *
 * La clave de Google nunca se incluye en el entorno del frontend.
 * Solo el servidor SSR lee `model` o `GEMINI_API_KEY` desde el entorno.
 */

export const environment = {
  production: false,
  /** Campo legado, siempre vacío para evitar exponer secretos al navegador. */
  keyModel: '',
} as const;
