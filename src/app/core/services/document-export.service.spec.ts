import { firstValueFrom } from 'rxjs';

import { DocumentExportService } from './document-export.service';
import { DocumentSection } from '../models/agent-workflow.model';

const SECTIONS: DocumentSection[] = [
  {
    id: 'section-1',
    templateSectionId: 'objeto',
    title: 'Objeto social',
    content: '<h3>Objeto social</h3><p>Sociedad <strong>Demo</strong> SAS. Área de prueba con acentos: ñáéíóú.</p>',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
];

describe('DocumentExportService', () => {
  const service = new DocumentExportService();

  it('compiles a real PDF blob', async () => {
    const blob = await firstValueFrom(service.compilePreviewPdf(SECTIONS, 'Documento de prueba'));
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
    const header = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('exports a real DOCX blob', async () => {
    const blob = await firstValueFrom(service.exportDocx(SECTIONS, 'Documento de prueba'));
    expect(blob.size).toBeGreaterThan(0);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // ZIP local file header 'PK\x03\x04'
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
