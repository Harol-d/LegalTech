import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ToolbarModule } from 'primeng/toolbar';

import { DocumentExportService } from '../../../../core/services/document-export.service';
import { PdfPreviewer } from '../../../../shared/components/pdf-previewer/pdf-previewer';
import { DocumentTemplate } from '../../../../core/models/document-template.model';
import { StartupContext } from '../../../../core/models/startup-context.model';
import { DocumentSection } from '../../../../core/models/agent-workflow.model';

/**
 * Paso 3 — Ensamblaje, previsualización y exportación.
 * Agente Ensamblador y Formateador. PDF preview (ngx-extended-pdf-viewer) + PDF/DOCX.
 */
@Component({
  selector: 'app-step-final-preview',
  standalone: true,
  imports: [ButtonModule, CardModule, MessageModule, ToolbarModule, PdfPreviewer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './step-final-preview.html',
})
export class StepFinalPreview implements OnInit {
  private readonly exportService = inject(DocumentExportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sections = input.required<DocumentSection[]>();
  readonly template = input.required<DocumentTemplate>();
  readonly context = input.required<StartupContext>();

  readonly loadingPdf = signal<boolean>(true);
  readonly exportingPdf = signal<boolean>(false);
  readonly exportingDocx = signal<boolean>(false);
  readonly pdfSrc = signal<Blob | null>(null);
  readonly error = signal<string | null>(null);

  readonly documentTitle = computed(() => {
    const ctx = this.context();
    const company = ctx.legalName || ctx.companyName || 'Documento';
    return `${company} — ${this.template().name}`;
  });

  readonly fileBaseName = computed(() => slugify(`${this.context().legalName || this.context().companyName}-${this.template().id}`));

  ngOnInit(): void {
    this.compilePreview();
  }

  /** Recompilar la vista previa. */
  compilePreview(): void {
    this.loadingPdf.set(true);
    this.error.set(null);
    this.exportService
      .compilePreviewPdf(this.sections(), this.documentTitle())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.pdfSrc.set(blob);
          this.loadingPdf.set(false);
        },
        error: () => {
          this.error.set('No se pudo compilar la vista previa del documento.');
          this.loadingPdf.set(false);
        },
      });
  }

  downloadPdf(): void {
    this.exportingPdf.set(true);
    this.exportService
      .exportPdf(this.sections(), this.documentTitle())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          triggerDownload(blob, `${this.fileBaseName()}.pdf`);
          this.exportingPdf.set(false);
        },
        error: () => this.exportingPdf.set(false),
      });
  }

  downloadDocx(): void {
    this.exportingDocx.set(true);
    this.exportService
      .exportDocx(this.sections(), this.documentTitle())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          triggerDownload(blob, `${this.fileBaseName()}.docx`);
          this.exportingDocx.set(false);
        },
        error: () => this.exportingDocx.set(false),
      });
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'documento'
  );
}
