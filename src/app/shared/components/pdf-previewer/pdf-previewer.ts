import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

/**
 * Wrapper reutilizable de `ngx-extended-pdf-viewer`.
 * Alimenta el visor con el documento ensamblado (`Observable<Blob>` -> signal/Blob).
 */
@Component({
  selector: 'app-pdf-previewer',
  standalone: true,
  imports: [NgxExtendedPdfViewerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src()) {
      <ngx-extended-pdf-viewer
        [src]="src()!"
        [height]="height()"
        [showDownloadButton]="false"
        [showPrintButton]="true"
        [textLayer]="true"
        language="es-ES"
      />
    } @else {
      <div class="flex h-96 items-center justify-center rounded border border-dashed border-gray-300 text-sm text-gray-500">
        Preparando vista previa del documento…
      </div>
    }
  `,
})
export class PdfPreviewer {
  /** Fuente del PDF: Blob, Uint8Array, ArrayBuffer, URL o base64. */
  readonly src = input<string | Blob | Uint8Array | ArrayBuffer | null>(null);
  readonly height = input<string>('80vh');
}
