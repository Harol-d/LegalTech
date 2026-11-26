# Legal

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Inteligencia artificial (Google Gemini + File Search)

La redacción de cláusulas, la regeneración y la auditoría usan **solo modelos de Google** a través de la capa de servicios (`src/app/core/services`), con un proxy en el servidor SSR (`src/server/`). La clave **nunca** se envía al navegador.

1. Cree el archivo de entorno y complete la clave:

   ```bash
   cp .env.example .env
   ```

   ```dotenv
   key-Model=SU_CLAVE_DE_GOOGLE_AI_STUDIO
   # GEMINI_MODEL=gemini-2.5-flash        # opcional
   # FILE_SEARCH_STORE_NAME=              # opcional (se crea automáticamente)
   ```

   Obtenga la clave en <https://aistudio.google.com/apikey>.

2. Arranque la aplicación (`ng serve` o `npm run build && npm run serve:ssr:legal`). El servidor indexa el corpus legal (las 9 plantillas + archivos `knowledge/*.md|*.txt`) en un *File Search Store* de Google la primera vez.

3. Si `key-Model` está vacía, la aplicación usa **modo demostración local** con borradores simulados. Si una solicitud real de Gemini falla (por ejemplo, por límite de cuota), el Paso 2 muestra el error y permite volver a intentar; no sustituye silenciosamente la respuesta por un borrador local.

Endpoints internos (servidor SSR): `GET /api/ai/status`, `POST /api/ai/knowledge-base/index`, `POST /api/ai/draft-document`, `POST /api/ai/draft-section`, `POST /api/ai/regenerate-section`, `POST /api/ai/audit`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
