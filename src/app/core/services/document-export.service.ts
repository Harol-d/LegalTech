import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { delay } from 'rxjs/operators';

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';

import { MOCK_NETWORK_LATENCY_MS } from './document-catalog.service';
import { DocumentSection } from '../models/agent-workflow.model';

/** Título por defecto del documento ensamblado. */
export const DEFAULT_EXPORT_TITLE = 'Documento legal';

/** Aviso legal añadido al documento exportado. */
export const EXPORT_DISCLAIMER =
  'Borrador generado con asistencia de IA. Requiere revisión humana (Human-in-the-Loop) y validación por un abogado antes de su uso. No constituye asesoría legal.';

/**
 * Agente Ensamblador y Formateador + exportación.
 *
 * Release 1: generación local (mocked, sin backend). Produce PDF real
 * (pdf-lib) y DOCX real (docx). Tipado estricto, `Observable<Blob>`, latencia
 * simulada con `delay()`. Sin llamadas HTTP a URLs inexistentes.
 */
@Injectable({ providedIn: 'root' })
export class DocumentExportService {
  /** Compila el PDF de previsualización del documento ensamblado. */
  compilePreviewPdf(sections: readonly DocumentSection[], title: string = DEFAULT_EXPORT_TITLE): Observable<Blob> {
    return from(buildPdfBlob(title, sections)).pipe(delay(MOCK_NETWORK_LATENCY_MS));
  }

  /** Exporta el documento en PDF. */
  exportPdf(sections: readonly DocumentSection[], title: string = DEFAULT_EXPORT_TITLE): Observable<Blob> {
    return from(buildPdfBlob(title, sections)).pipe(delay(MOCK_NETWORK_LATENCY_MS));
  }

  /** Exporta el documento en DOCX (OOXML). */
  exportDocx(sections: readonly DocumentSection[], title: string = DEFAULT_EXPORT_TITLE): Observable<Blob> {
    return from(buildDocxBlob(title, sections)).pipe(delay(MOCK_NETWORK_LATENCY_MS));
  }
}

// ---------------------------------------------------------------------------
// Helpers de ensamblado (fuera de los componentes).
// ---------------------------------------------------------------------------

/** Convierte HTML simple a texto plano con saltos de línea. */
function htmlToPlainText(html: string): string {
  return (html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|blockquote|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Sanitiza texto para fuentes PDF estándar (WinAnsi). */
function sanitizeForPdf(text: string): string {
  const replacements: Record<string, string> = {
    '\u2018': "'",
    '\u2019': "'",
    '\u201A': ',',
    '\u201B': "'",
    '\u201C': '"',
    '\u201D': '"',
    '\u201E': '"',
    '\u2013': '-',
    '\u2014': '-',
    '\u2015': '-',
    '\u2026': '...',
    '\u00A0': ' ',
    '\u2009': ' ',
    '\u2022': '•',
    '\u25CF': '•',
    '\u00AD': '',
  };
  let out = text;
  for (const [from, to] of Object.entries(replacements)) {
    out = out.split(from).join(to);
  }
  // Mantener Latin-1/WinAnsi imprimibles; sustituir el resto.
  return out.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

interface WrappedLine {
  text: string;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): WrappedLine[] {
  const lines: WrappedLine[] = [];
  const rawLines = sanitizeForPdf(text).split('\n');
  for (const rawLine of rawLines) {
    const words = rawLine.split(/(\s+)/);
    let current = '';
    for (const word of words) {
      const candidate = current + word;
      if (font.widthOfTextAtSize(candidate.trimEnd(), size) > maxWidth && current.trim().length > 0) {
        lines.push({ text: current.trimEnd() });
        current = word.trimStart();
      } else {
        current = candidate;
      }
    }
    lines.push({ text: current.trimEnd() });
  }
  return lines;
}

async function buildPdfBlob(title: string, sections: readonly DocumentSection[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;
  const bodySize = 10.5;
  const lineHeight = 14;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed: number): void => {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawLine = (text: string, size: number, useBold: boolean, color = rgb(0.1, 0.1, 0.12)): void => {
    ensureSpace(size + 4);
    page.drawText(text, { x: margin, y, size, font: useBold ? bold : font, color });
    y -= size + 4;
  };

  // Portada / encabezado.
  drawLine(sanitizeForPdf(title), 20, true);
  y -= 6;
  drawLine(`Documento generado: ${new Date().toLocaleDateString('es-CO')}`, 9, false, rgb(0.4, 0.4, 0.45));
  y -= 4;
  for (const l of wrapText(EXPORT_DISCLAIMER, font, 9, contentWidth)) {
    drawLine(l.text, 9, false, rgb(0.4, 0.4, 0.45));
  }
  y -= 10;

  for (const section of sections) {
    // Título de sección.
    ensureSpace(28);
    y -= 6;
    drawLine(sanitizeForPdf(section.title), 13, true);
    y -= 2;
    const plain = htmlToPlainText(section.content);
    const lines = wrapText(plain, font, bodySize, contentWidth);
    for (const line of lines) {
      if (line.text === '') {
        y -= lineHeight * 0.5;
        continue;
      }
      ensureSpace(lineHeight);
      page.drawText(line.text, { x: margin, y, size: bodySize, font, color: rgb(0.12, 0.12, 0.15) });
      y -= lineHeight;
    }
    y -= 8;
  }

  // Pie de página con número de página.
  const pages = pdf.getPages();
  pages.forEach((p: PDFPage, index: number) => {
    const label = `Página ${index + 1} de ${pages.length}`;
    p.drawText(label, {
      x: pageWidth - margin - font.widthOfTextAtSize(label, 8),
      y: margin / 2,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.55),
    });
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

async function buildDocxBlob(title: string, sections: readonly DocumentSection[]): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `Documento generado: ${new Date().toLocaleDateString('es-CO')}` }),
    new Paragraph({
      children: [new TextRun({ text: EXPORT_DISCLAIMER, italics: true, size: 18, color: '666666' })],
      spacing: { after: 240 },
    }),
  ];

  for (const section of sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
    const plain = htmlToPlainText(section.content);
    const paragraphs = plain.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
    if (paragraphs.length === 0) {
      children.push(new Paragraph({ text: '' }));
    } else {
      for (const p of paragraphs) {
        children.push(new Paragraph({ children: [new TextRun(p)], spacing: { after: 120 } }));
      }
    }
  }

  const doc = new DocxDocument({
    creator: 'Legal Doc Wizard',
    title,
    description: EXPORT_DISCLAIMER,
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
