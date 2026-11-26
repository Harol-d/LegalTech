import { Routes } from '@angular/router';

import { TemplateCatalog } from './features/document-wizard/pages/template-catalog/template-catalog';
import { WizardWorkspace } from './features/document-wizard/pages/wizard-workspace/wizard-workspace';

export const routes: Routes = [
  { path: '', component: TemplateCatalog, title: 'Catálogo de documentos legales' },
  { path: 'wizard/:templateId', component: WizardWorkspace, title: 'Asistente de documento legal' },
  { path: '**', redirectTo: '' },
];
