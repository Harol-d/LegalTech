// Genera configuración del frontend sin secretos; la clave solo vive en el servidor.
import { writeFileSync } from 'node:fs';

const out =
  '// GENERADO por scripts/sync-env.mjs. NO editar.\n' +
  "export const generatedEnvironment = { keyModel: '' } as const;\n";
writeFileSync('src/environments/environment.generated.ts', out);
