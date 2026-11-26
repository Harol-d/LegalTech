import { bootstrapApplication } from '@angular/platform-browser';
import { pdfDefaultOptions } from 'ngx-extended-pdf-viewer';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Assets de pdf.js servidos desde 'bleeding-edge' (ver angular.json).
pdfDefaultOptions.assetsFolder = 'bleeding-edge';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
