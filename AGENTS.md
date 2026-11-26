---
name: legal-doc-wizard-frontend
description: Reglas de arquitectura, stack tecnológico y convenciones de código para el desarrollo frontend (Release 1) de la aplicación generadora de documentos legales para startups en Colombia.
version: 1.0.0
framework: Angular
ui_library: PrimeNG
css_framework: Tailwind CSS
---
## 1. Contexto del Proyecto

Aplicación web para la generación automatizada de documentos legales para startups en Colombia mediante un flujo estructurado tipo **Wizard** con revisión humana (**Human-in-the-Loop**).

En esta **Release 1**, el alcance se centra exclusivamente en construir una interfaz de usuario completa, reactiva y desacoplada del backend. Toda comunicación con agentes de IA y generación de archivos se abstrae en una capa de servicios Angular que exponen **Observables RxJS** (inicialmente con datos simulados/mocked, listos para conectarse a endpoints HTTP reales sin modificar los componentes).

---

## 2. Stack Tecnológico y Restricciones Estrictas

- **Framework:** Angular (Standalone Components, Signals / RxJS, Typed Reactive Forms).
- **Estilos:** Tailwind CSS (exclusivamente para layout, grid, espaciado, flex y tipografía utilitaria).
- **Librería UI:** **ÚNICAMENTE PrimeNG** (`p-stepper`, `p-card`, `p-button`, `p-accordion`, `p-editor`, `p-textarea`, `p-inputtext`, `p-inputnumber`, `p-select`, `p-table`, `p-tag`, `p-timeline`, `p-message`, `p-toolbar`, `p-dialog`, `p-skeleton`, `p-progressbar`).
  - **PROHIBIDO:** No crear botones, inputs, modales, tablas o tarjetas HTML nativas estilizadas desde cero ni mezclar otras librerías UI (como Angular Material o Bootstrap). Todo control interactivo debe ser un componente de PrimeNG.
- **Visor de Documentos:** `ngx-extended-pdf-viewer` para previsualizar el documento ensamblado antes de su descarga en `.pdf` o `.docx`.
- **Backend:** No definido aún. No implementar llamadas directas con `HttpClient` hacia URLs inexistentes; encapsular toda lógica de datos en servicios que retornen `Observable<T>`.

---

## 3. Arquitectura y Estructura de Carpetas (`UI -> Services`)

La UI **nunca** debe contener lógica de negocio, transformación de plantillas ni simulación de respuestas de agentes. Los componentes solo se suscriben a los servicios o consumen sus Observables mediante `async` pipe o `toSignal()`.

```text
src/app/
├── core/
│   ├── models/
│   │   ├── startup-context.model.ts      # Datos maestros de la startup y socios
│   │   ├── document-template.model.ts    # Catálogo de plantillas legales y categorías
│   │   └── agent-workflow.model.ts       # Secciones redactadas, estados HITL y alertas de auditoría
│   └── services/
│       ├── document-catalog.service.ts   # getTemplates(), getTemplateById() -> Observable
│       ├── agent-orchestrator.service.ts # generateSectionDraft(), regenerateSection(), auditSections() -> Observable
│       └── document-export.service.ts    # compilePreviewPdf(sections) -> Observable<Blob>, exportDocx(sections) -> Observable<Blob>
├── shared/
│   └── components/
│       └── pdf-previewer/                # Wrapper reutilizable de ngx-extended-pdf-viewer
└── features/
    └── document-wizard/
        ├── pages/
        │   ├── template-catalog/         # Pantalla inicial: selección de plantilla legal
        │   └── wizard-workspace/         # Orquestador del flujo con p-stepper
        └── components/
            ├── step-startup-context/     # Paso 1: Formulario reactivo dinámico de contexto
            ├── step-agent-review/        # Paso 2: Revisión Human-in-the-Loop por cláusula
            └── step-final-preview/       # Paso 3: Visor PDF + descarga PDF/DOCX
```

---

## 4. Dominio Funcional: Catálogo de Documentos (Colombia)

La aplicación debe soportar la selección y construcción de las siguientes plantillas validadas agrupadas en 3 categorías:

### 1. Constitución y Registro
- Estatutos Sociales SAS (Documento privado de constitución).
- Cartas de Aceptación de Cargos (Representante Legal y Suplente).
- Guía de Diligenciamiento RUES y Reporte RUB (Beneficiarios Finales).

### 2. Socios e Inversión
- Acuerdo de Accionistas (Pacto de Socios).
- Contrato de Vesting (Con cliff y cronograma de consolidación).
- Contrato de Cesión de Propiedad Intelectual (IP Assignment).

### 3. Operación y Protección
- Política de Tratamiento de Datos Personales (Habeas Data - Ley 1581 de 2012).
- Términos y Condiciones de Plataforma Digital.
- Acuerdo de Confidencialidad (NDA) y Contrato de Prestación de Servicios.

---

## 5. Flujo del Wizard y Pipeline de Agentes

El componente `wizard-workspace` debe implementar un `p-stepper` lineal de 3 pasos con lógica Human-in-the-Loop (HITL):

### Paso 1: Contexto de la Startup (`step-startup-context`)
- **Rol:** Agente Entrevistador.
- **UI:** Formulario reactivo dinámico con componentes PrimeNG (`p-inputtext`, `p-inputnumber`, `p-select`, `p-table` para gestionar socios y porcentajes accionarios).
- **Regla:** Persistir los datos maestros de la startup en memoria/estado del servicio para reutilizarlos si el usuario genera múltiples documentos en la misma sesión.

### Paso 2: Redacción y Auditoría Human-in-the-Loop (`step-agent-review`)
- **Rol:** Agente Redactor Legal + Agente Auditor de Coherencia.
- **Layout:** Grid de Tailwind (`grid-cols-12 gap-4`).
  - **Columna Izquierda (8 cols):** Único editor de texto enriquecido (`p-editor`) que consolida y presenta todo el documento generado por la IA en un solo lienzo con títulos y cláusulas separadas.
    - Estado explícito (`PENDING_GENERATION` | `DRAFT_READY` | `USER_EDITED` | `APPROVED`) visualizado con `p-tag`.
    - Editor unificado editable para ajustes manuales en cualquier parte del documento.
    - Botón `p-button` **"Aprobar Todo el Documento"** y botones individuales de regeneración por cláusula para refinar secciones específicas con `AgentOrchestratorService.regenerateSection()`.
  - **Columna Derecha (4 cols):** Panel lateral con `p-timeline` mostrando el progreso de ejecución de los agentes y tarjetas `p-message` con observaciones del Agente Auditor (ej. validación de suma de porcentajes al 100%, alertas de cumplimiento legal).
- **Regla de Bloqueo:** El botón para avanzar al Paso 3 debe permanecer deshabilitado hasta que el 100% de las secciones tengan estado `APPROVED`.

### Paso 3: Ensamblaje, Previsualización y Exportación (`step-final-preview`)
- **Rol:** Agente Ensamblador y Formateador.
- **UI:**
  - Barra superior (`p-toolbar`) con acciones para descargar en `.pdf` y `.docx`.
  - Renderizado del documento final usando `<ngx-extended-pdf-viewer>` alimentado por el `Observable<Blob>` retornado por `DocumentExportService.compilePreviewPdf()`.

---

## 6. Convenciones de Código para el Agente (OpenCode)

1. **Contratos de Servicios:** Todos los métodos en `core/services/*.service.ts` deben tener tipado estricto de entrada y salida, simulando latencia de red con `delay()` de RxJS para que la UI ejercite estados de carga (`p-skeleton` / `loading` en `p-button`).
2. **Sin Lógica en Templates:** Evitar expresiones complejas en los archivos `.html`. Usar getters, signals computados o pipes puros.
3. **Gestión de Suscripciones:** Evitar fugas de memoria; usar `async` pipe, `takeUntilDestroyed()` o `toSignal()`.
4. **Idioma:** Todo el código (variables, clases, interfaces, nombres de archivos) debe escribirse en **inglés**, mientras que todos los textos visibles en la UI, etiquetas, mensajes de validación y plantillas legales deben estar en **español** (contexto legal colombiano).

---

## 7. Implementación realizada (Release 1)

> Estado tras construir la interfaz completa. Esta sección documenta lo efectivamente implementado para conservar contexto. Fecha: 2026-11-26.

### 7.1 Dependencias instaladas (sobre la base Angular 22 + Tailwind 4 + SSR)
- **PrimeNG 21.1.10** (`primeng`, **licencia MIT** — sin clave PrimeUI obligatoria) + `@primeng/themes` 21.0.4 (preset **Aura** vía `providePrimeNG` en `src/app/app.config.ts`) + `@angular/cdk` 21 + `primeicons`. **Única** librería UI; sin Angular Material/Bootstrap ni controles nativos estilizados desde cero. (Nota honesta: PrimeNG v21 declara peer Angular 21; en Angular 22 funciona — build + tests + SSR verificados — pero el soporte oficial es v22. PrimeNG v22.1.5 funciona pero exige **clave PrimeUI**; si se usa v22, configurar `providePrimeNG({ license: '<CLAVE>' })`.)
- `quill` 2.0.3 (dependencia interna del `p-editor` de PrimeNG; CSS `quill.core.css`/`quill.snow.css` en `angular.json`).
- `ngx-extended-pdf-viewer` (ya presente, v32): assets `bleeding-edge` copiados a `public`/output vía `angular.json`; `pdfDefaultOptions.assetsFolder = 'bleeding-edge'` en `src/main.ts`. Wrapper `app-pdf-previewer`.
- `pdf-lib` (PDF real) y `docx` 9 (OOXML real) para generación local mocked.
- **Nota PrimeNG:** `p-inputtext` y `p-textarea` se usan como **directivas** (`<input pInputText>`, `<textarea pTextarea>`); no existen elementos `<p-inputtext>`/`<p-textarea>`. Todos los controles interactivos son componentes/directivas PrimeNG de la lista permitida. Ningún `<button>`/`<input>` nativo sin PrimeNG; descargas vía `p-button` + anchor creado programáticamente.
- `angular.json`: styles + assets; budgets `initial` 4mb/8mb; SSR `security.allowedHosts`; `app.routes.server.ts` usa `RenderMode.Server` para `**` (evita `getPrerenderParams` en ruta con parámetro).
- `src/index.html` `lang="es"`; `app.html` shell con `<router-outlet/>`.

### 7.2 Modelos (`src/app/core/models/`)
- `startup-context.model.ts`: `StartupContext`, `Partner`, `DocumentType`, `PartnerRole`, `LegalEntityType`, `CompanyLegalType`, `PARTNER_ROLES`, `DOCUMENT_TYPES`, `LEGAL_ENTITY_TYPES`, `createEmptyStartupContext`, `createEmptyPartner`, `generateId`, `totalSharePercentage`. SAS.
- `document-template.model.ts`: `DocumentTemplate`, `LegalSectionDefinition`, `TemplateCategory` (3 categorías en español), `TemplateCategoryGroup`.
- `agent-workflow.model.ts`: `DocumentSection`, `SectionStatus` (`PENDING_GENERATION|DRAFT_READY|USER_EDITED|APPROVED`), `SECTION_STATUS_LABELS`, `AuditAlert`, `AuditSeverity`, `AuditCategory`, `AgentRole`, `AgentActivityStatus`, `AgentTimelineEvent`, `generatePlaceholder`.

### 7.3 Catálogo (`src/app/core/data/legal-templates.ts` + `DocumentCatalogService`)
- **9 plantillas** validadas para Colombia en **3 categorías** (textos español; código inglés). Cada una con `sections[]` (cláusulas) y `legalBasis[]`.
  - Constitución y Registro: `estatutos-sociales-sas`, `cartas-aceptacion-cargos`, `guia-diligenciamiento-rues-rub`.
  - Socios e Inversión: `acuerdo-accionistas`, `contrato-vesting`, `contrato-cesion-propiedad-intelectual`.
  - Operación y Protección: `politica-tratamiento-datos`, `terminos-condiciones-plataforma`, `nda-prestacion-servicios`.
- Bases legales citadas (Colombia): Ley 1429/2010, Código de Comercio, Código Civil, Ley 1258/2008, Ley 222/1995, Ley 975/2005 + Res.126/2014 CC, Ley 1783/2016 + Dec.2131/2016, Ley 1563/2012, Dec.2466/2012, Cód. Com. art.2610-2614, Decisión 351 CAN, Ley 1450/2011, Dec.2685/1999, Ley 23/1982, Ley 1581/2012 + Dec.1377/2013 + Dec.1074/2015, Ley 1266/2008, Ley 1480/2011, Ley 527/1999, Ley 1437/2011, Ley 50/1990 art.29, etc.
- `DocumentCatalogService` (`document-catalog.service.ts`): `getTemplates(): Observable<DocumentTemplate[]>`, `getTemplateById(id): Observable<DocumentTemplate|undefined>`, `getTemplatesByCategory(): Observable<TemplateCategoryGroup[]>`, `getTemplatesInCategory(...)`, `getCategories()`. Tipado estricto + `delay(MOCK_NETWORK_LATENCY_MS=600)`. Mocked; sin `HttpClient` a URLs inexistentes.

### 7.4 `AgentOrchestratorService` (`agent-orchestrator.service.ts`)
> **Actualizado en §7.10:** los borradores y la auditoría ahora se delegan a Google Gemini (con RAG); lo aquí descrito se conserva como **modo de respaldo local** cuando no hay `model` o falla la red.
- Estado en memoria: `startupContext` (signal) + `setStartupContext/getStartupContext/clearStartupContext` (**persistir datos maestros para reutilizar en varios documentos en la sesión**).
- `generateSectionDraft(def, template, ctx): Observable<DocumentSection>` (**Agente Redactor Legal**).
- `regenerateSection(section, instruction, template, ctx): Observable<DocumentSection>` (HITL; vuelve a `DRAFT_READY`, re-aprobación; anota instrucción).
- `auditSections(sections, ctx, template): Observable<AuditAlert[]>` (**Agente Auditor de Coherencia**). Cálculos deterministas mocked: **suma de porcentajes accionarios al 100%** (±0.01), socios vacíos, datos maestros obligatorios (razón social/nombre/NIT/ciudad/objeto/datos socio), secciones vacías/pendientes, conteo aprobadas, base legal de cumplimiento.
- `AGENT_MOCK_LATENCY_MS=900`, `delay()`. Borradores mocked en español marcados como borrador a revisar.

### 7.5 `DocumentExportService` (`document-export.service.ts`, **Agente Ensamblador y Formateador**)
- `compilePreviewPdf(sections, title=...): Observable<Blob>`, `exportPdf(...): Observable<Blob>`, `exportDocx(...): Observable<Blob>`. Tipado estricto + `delay(600)`. `DEFAULT_EXPORT_TITLE`, `EXPORT_DISCLAIMER`.
- Genera **PDF real** (pdf-lib, A4, título, pie "Página X de N", saneo WinAnsi, aviso legal, extracción HTML→texto) y **DOCX real** (docx; título/fecha/aviso/secciones). HTML→texto. Sin backend.
- Descargas en Paso 3 vía `URL.createObjectURL` + nombre `slugify`. **No** `HttpClient`.

### 7.6 Componentes (standalone, `OnPush`, Signals + Reactive Forms; sin lógica en template)
- `shared/components/pdf-previewer/pdf-previewer.ts`: `app-pdf-previewer`, `src` (`PdfSrcType`), `height`, envuelve `NgxExtendedPdfViewerModule` (`ngx-extended-pdf-viewer`).
- `features/document-wizard/pages/template-catalog/` (`template-catalog.ts/.html`): `p-card`, `p-tag`, `p-skeleton`, `p-button`, `p-message`; `toSignal(getTemplatesByCategory())`; navega `/wizard/:templateId`. Disclaimer legal.
- `features/document-wizard/pages/wizard-workspace/` (`wizard-workspace.ts/.html`): `app-wizard-workspace`, **`p-stepper` `[linear]="true"` 3 pasos**, `p-step`/`p-step-list`/`p-step-panels`/`p-step-panel`; lee `templateId` de `ActivatedRoute` (`switchMap`+`getTemplateById`, `loaded` flag); `currentStep`; `startupContext`; `sections`; **regla de bloqueo `canAdvanceToStep3`** (100% `APPROVED`, `[disabled]`, `goToStep(3)` guard, `p-step` disabled); `approvedCount`. Ruta `/wizard/:templateId`.
- `step-startup-context` (`app-step-startup-context`, **Paso 1**, Agente Entrevistador): **FormGroup tipado no-nullable + FormArray socios**; `p-inputtext`,`p-inputnumber`,`p-select`,`p-textarea`,`p-table`,`p-button`,`p-card`,`p-message`; validadores + validador `shareSumValidator` (suma=100); `totalShare`/`shareSumOk`/`formValid` computed; `addPartner/removePartner`; capital=acciones×valor nominal; persiste vía `orchestrator.setStartupContext`; `contextReady` output; **PrimeNG p-table** editable. Prefill desde memoria.
- `step-agent-review` (`app-step-agent-review`, **Paso 2**, Redactor + Auditor): `template`,`context`,`cachedSections` inputs; `sectionsChange` output. **grid-cols-12 gap-4**; izq `md:col-span-8` `p-accordion`(multiple); `p-tag` estado; `p-editor` (ngModelChange→USER_EDITED; editar `APPROVED`→`USER_EDITED`); **"Regenerar con Agente"** `p-dialog` + `p-textarea` instrucción → `regenerateSection`; **"Aprobar Sección"**→`APPROVED`. der `md:col-span-4` `p-card`, **`p-timeline`** eventos agentes, **`p-message`** auditor + "Re-auditar", `p-progressbar`, `p-message` bloqueo. `p-skeleton`/`loading`, `p-button [loading]`. `takeUntilDestroyed`. `forkJoin` generación; cached restore. `allApproved`/`progress`/`approvedCount`.
- `step-final-preview` (`app-step-final-preview`, **Paso 3**, Ensamblador): `p-toolbar` **Descargar PDF/DOCX**; `app-pdf-previewer`; `p-message`; `compilePreviewPdf` Observable<Blob>→signal; `documentTitle`; `fileBaseName`; loading/exporting; `p-card`. 
- **Disclaimers** (UI español): borrador IA + revisión humana + validación por abogado; no asesoría legal. HITL obligatorio.

### 7.7 Rutas (`app.routes.ts`) + i18n
- `''` → TemplateCatalog; `wizard/:templateId` → WizardWorkspace; `**` redirect. SSR `RenderMode.Server`. UI español; código inglés.

### 7.8 Convenciones aplicadas (§6)
1. Servicios `core/services/*.service.ts` tipado estricto + `delay()`; p-skeleton/p-button loading.
2. Sin lógica compleja en `.html`; `computed`, getters.
3. `takeUntilDestroyed`, `toSignal`, signals; sin fugas.
4. Código/identificadores en inglés; textos visibles + plantillas legales en español (Colombia).

### 7.9 Verificación
- `npm run build` (Angular 22 SSR) ✔ sin errores.
- `npm test` (Vitest) ✔ tests: `app` (render header) + `DocumentExportService` (PDF `%PDF-`, DOCX zip `PK\x03\x04`, acentos español, blob no vacío) + `StepStartupContext` (form reactivo, `FormArray`, `p-table`, suma=100, emit/persist, add/remove socio) + `AgentOrchestratorService` (memoria, `DRAFT_READY`, auditoría suma=100%). Los tests finales los ejecuta el usuario.
- SSR smoke (`node dist/legal/server/server.mjs`): `GET /` 200, `GET /wizard/estatutos-sociales-sas` 200.
- Generación PDF/DOCX verificada (blob válido). Warnings no bloqueantes: CommonJS `quill-delta`/`pako`. **PrimeNG v21.1.10 es MIT: no aparece aviso de licencia PrimeUI.**
- Datos generados son borradores; requieren revisión humana y validación legal.

### 7.10 Capa de IA real: Google Gemini + File Search (RAG) — Release 1.1

> Fecha: 2026-11-26. Sustituye los borradores simulados de `AgentOrchestratorService` por llamadas reales a Google, manteniendo el fallback local.

**Regla de seguridad:** la clave `model` vive **solo** en el servidor SSR. El navegador nunca habla con Google; los servicios Angular consumen `/api/ai/*`.

```text
Componentes → core/services (AiGatewayService, AgentOrchestratorService)
            → HttpClient /api/ai/*  →  src/server.ts (Express)
            → @google/genai → Gemini + File Search Store
```

**Dependencias:** `@google/genai` 3.6.1 (solo servidor; `externalDependencies` en `angular.json`), Node ≥22 (probado en 26). PrimeNG/Angular sin cambios.

**Variables de entorno (`.env` en la raíz, nunca versionado):**
- `model` — clave de Google AI Studio (vacía = modo demostración local).
- `GEMINI_MODEL` — opcional, por defecto `gemini-2.5-flash`; si el modelo está saturado (503), no existe (404) o agota cuota (429), el servidor prueba respaldos (`gemini-2.5-flash-lite`, `gemini-flash-latest`) sin tocar la UI.
- `FILE_SEARCH_STORE_NAME` — opcional; si se omite, el store se crea/reutiliza automáticamente.

**Módulos de servidor (`src/server/`):**
- `env.ts`: parser de `.env` sin dependencias (busca en cwd y ancestros; no sobreescribe el entorno real).
- `gemini.client.ts`: cliente perezoso, `isAiEnabled()`, `getGeminiModel()`, `generateStructured()` con soporte de esquemas JSON y herramienta `fileSearch` (RAG). **Manejo de degradación de intentos corregido:**
  - *Conflicto esquema + File Search:* la API de Gemini rechaza formalmente el uso conjunto de `tools` con `responseMimeType: 'application/json'` o `responseSchema` (código 400). Se inicializa `schemaWithToolsUnsupported = true` para evitar llamadas inválidas contra la API y pasar directamente a `RAG sin esquema`, parseando el JSON retornado.
  - *Modelos de respaldo actualizados:* se definen modelos vigentes (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-flash-latest`), evitando identificadores inexistentes o en desuso que bloqueaban el fallback.
  - *Contexto de inyección en Angular (`takeUntilDestroyed`):* corregido el uso de `takeUntilDestroyed()` en `StepAgentReview` y `StepFinalPreview` pasando explícitamente `inject(DestroyRef)` para evitar la excepción en tiempo de ejecución `NG0203` en `ngOnInit` / métodos de eventos, lo cual abortaba la suscripción a `/api/ai/*` e impedía pintar las secciones en la UI.
- `legal-knowledge-base.ts`: corpus = 9 plantillas de `core/data/legal-templates.ts` + archivos `knowledge/*.md|*.txt`; `ensureKnowledgeBaseIndexed()`, `resolveRagStoreNames()`, cache `.gemini-cache.json`, versión de corpus por hash (FNV-1a).
- `prompts.ts`: instrucciones de sistema y prompts en español (redactor legal Colombia, auditor de coherencia), esquemas JSON (`Type` de `@google/genai`), `startupContextBlock()`, `stripHtml()`.
- `ai.routes.ts`: `GET /api/ai/status`, `POST /api/ai/knowledge-base/index`, `/draft-document`, `/draft-section`, `/regenerate-section`, `/audit`; validación de payload, saneo de HTML y errores tipados (`AI_NOT_CONFIGURED` 503, `INVALID_REQUEST` 400, `NOT_FOUND` 404, `AI_ERROR` 502).

**Cliente:** `core/models/ai.model.ts` (`AiMode`, `RagCitation`, `AiStatus`, `KnowledgeBaseStatus`, `DocumentDraftResponse`, `SectionDraftResponse`, `AuditResponse`) y `core/services/ai-gateway.service.ts` (único punto HTTP; `HttpClient` opcional para no romper pruebas aisladas; `timeout(180s)` y mensajes en español).

**Servicio orquestador:** `generateDocumentDraft()` (una llamada para todas las cláusulas), `generateSectionDraft()`, `regenerateSection()` y `auditSections()` (reglas deterministas locales + observaciones del modelo, deduplicadas). Señales: `aiMode`, `aiStatus`, `lastCitations`. Si no hay clave o falla la red → `local-fallback` con los borradores simulados (la UI nunca se rompe).

**UI (Paso 2):** tag con el modo (`Gemini + File Search (RAG)` / `Gemini (sin RAG)` / `Demostración local`), modelo y nº de documentos indexados, botón «Reindexar corpus», aviso de modo demostración, lista de fuentes RAG recuperadas. Se mantiene la regla HITL: 100% `APPROVED` para avanzar.

**Fix del flujo del wizard:** en PrimeNG 21 el `p-step-panel` **no proyecta contenido** (`<ng-content>`); el contenido debe ir dentro de `<ng-template pTemplate="content">` (o `#content`). `wizard-workspace.html` fue corregido; antes el panel del Paso 1 se renderizaba vacío y «Usar plantilla» parecía no hacer nada.

**Corpus ampliable:** cualquier `.md`/`.txt` en `knowledge/` se indexa en el siguiente arranque/reindexado. Tras cambiar el corpus o el modelo, el hash de versión fuerza la reindexación.

**Verificación (sin tests):** `npm run build` ✔ exitoso; los modelos e intentos de degradación se validan sin errores de esquema ni bloqueo de modelo.

**Nota:** `core/services/google-ai.service.ts` y `file-search.service.ts` son implementaciones heredadas del enfoque cliente‑directo (leen la clave en el navegador) y **no se usan**; la vía oficial es `ai-gateway.service.ts` + `/api/ai/*`.
