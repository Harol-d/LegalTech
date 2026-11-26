// Sincroniza `.env` -> src/environments/environment.generated.ts (sin dependencias).
// La clave `model` se inyecta en tiempo de build; el valor nunca se commitea.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

let keyModel = process.env['model'] ?? '';
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*model\s*=\s*(.*)\s*$/);
    if (m && m[1].trim() !== '') keyModel = m[1].trim().replace(/^["']|["']$/g, '');
  }
}

const out = `// GENERADO por scripts/sync-env.mjs. NO editar ni commitear valores.\nexport const generatedEnvironment = { keyModel: ${JSON.stringify(keyModel)} } as const;\n`;
writeFileSync('src/environments/environment.generated.ts', out);
