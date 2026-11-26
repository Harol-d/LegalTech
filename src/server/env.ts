import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Carga variables de entorno desde `.env` sin dependencias externas.
 *
 * Busca el archivo en el directorio de trabajo actual y en sus dos ancestros
 * (cubre `npm start` desde la raíz y `node dist/legal/server/server.mjs`).
 * Nunca sobreescribe variables ya definidas en el entorno real.
 */
export function loadDotEnv(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '.env'),
    join(process.cwd(), '..', '..', '.env'),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      parseEnvFile(readFileSync(path, 'utf8'));
    } catch (error) {
      console.warn(`[env] No se pudo leer ${path}:`, error);
    }
    return;
  }
}

function parseEnvFile(raw: string): void {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
