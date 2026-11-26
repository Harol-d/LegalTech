import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { Editor, EditorModule } from 'primeng/editor';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';

import { AgentOrchestratorService } from '../../../../core/services/agent-orchestrator.service';
import { DocumentTemplate } from '../../../../core/models/document-template.model';
import { StartupContext } from '../../../../core/models/startup-context.model';
import {
  AgentTimelineEvent,
  AuditAlert,
  AuditSeverity,
  DocumentSection,
  SECTION_STATUS_LABELS,
  SectionStatus,
} from '../../../../core/models/agent-workflow.model';
import { AI_MODE_LABELS, AiMode, RagCitation } from '../../../../core/models/ai.model';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * Paso 2 — Redacción y Auditoría Human-in-the-Loop.
 *
 * Fix: p-editor en OnPush + Signals no actualiza el DOM de Quill con [ngModel].
 * Solución: se guarda el contenido en una propiedad de clase normal (`editorContent`)
 * que sí detecta el two-way binding de Quill, y se sincroniza explícitamente
 * via writeValue() de Quill tras cada generación/regeneración.
 */
@Component({
  selector: 'app-step-agent-review',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    EditorModule,
    MessageModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    TimelineModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './step-agent-review.html',
})
export class StepAgentReview implements OnInit, AfterViewInit {
  private readonly orchestrator = inject(AgentOrchestratorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('editor') editorRef?: Editor;

  readonly template = input.required<DocumentTemplate>();
  readonly context = input.required<StartupContext>();
  readonly cachedSections = input<DocumentSection[] | null>(null);
  readonly sectionsChange = output<DocumentSection[]>();

  // ── constantes de UI ────────────────────────────────────────────────
  readonly statusLabels = SECTION_STATUS_LABELS;

  // ── signals de estado ───────────────────────────────────────────────
  readonly sections = signal<DocumentSection[]>([]);
  readonly loading = signal<boolean>(true);
  readonly regenerating = signal<boolean>(false);
  readonly generationError = signal<string | null>(null);
  readonly regenerationError = signal<string | null>(null);
  readonly auditing = signal<boolean>(false);
  readonly indexingCorpus = signal<boolean>(false);
  readonly auditAlerts = signal<AuditAlert[]>([]);
  readonly timeline = signal<AgentTimelineEvent[]>([]);
  readonly citations = signal<RagCitation[]>([]);

  /**
   * Propiedad de clase (no signal) para el two-way binding [(ngModel)] de p-editor.
   * Se actualiza desde syncUnifiedFromSections() y se propaga a Quill
   * directamente vía writeValue() para garantizar la renderización en OnPush.
   */
  editorContent = '';

  // ── estado de IA ────────────────────────────────────────────────────
  readonly aiMode = this.orchestrator.aiMode;
  readonly aiStatus = this.orchestrator.aiStatus;
  readonly modeLabel = computed(() => AI_MODE_LABELS[this.aiMode()]);
  readonly isAiUnavailable = computed(() => this.aiMode() === 'unavailable');
  readonly aiMessage = computed(() => this.aiStatus()?.message ?? null);

  // ── diálogo de regeneración ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly dialogSection = signal<DocumentSection | null>(null);
  readonly instruction = signal<string>('');

  // ── computadas ──────────────────────────────────────────────────────
  readonly totalCount = computed(() => this.sections().length);
  readonly approvedCount = computed(() =>
    this.sections().filter(s => s.status === 'APPROVED').length
  );
  readonly progress = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.approvedCount() / total) * 100);
  });
  readonly allApproved = computed(
    () => this.totalCount() > 0 && this.approvedCount() === this.totalCount()
  );
  readonly hasCitations = computed(() => this.citations().length > 0);

  // ── lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.orchestrator.refreshAiStatus().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    const cached = this.cachedSections();
    if (cached && cached.length > 0) {
      this.sections.set(cached.map(s => ({ ...s })));
      this.citations.set(this.orchestrator.lastCitations());
      this.syncUnifiedFromSections(this.sections());
      if (!this.editorContent.trim()) {
        this.generateAll();
      } else {
        this.loading.set(false);
        this.emitSections();
        this.runAudit();
      }
    } else {
      this.generateAll();
    }
  }

  ngAfterViewInit(): void {
    // Si el editor ya tiene contenido al iniciar (ej. caché), lo escribe en Quill.
    if (this.editorContent) {
      this.writeToQuill(this.editorContent);
    }
  }

  // ── Agente Redactor Legal ───────────────────────────────────────────
  generateAll(): void {
    const template = this.template();
    const context = this.context();
    const defs = template.sections;

    this.loading.set(true);
    this.generationError.set(null);
    this.sections.set(
      defs.map(def => ({
        id: `section-${def.id}`,
        templateSectionId: def.id,
        title: def.title,
        content: '',
        status: 'PENDING_GENERATION' as SectionStatus,
        updatedAt: new Date().toISOString(),
      }))
    );
    this.emitSections();
    this.pushTimeline(
      'Agente Redactor Legal',
      `Generando ${defs.length} cláusulas con Google Gemini…`,
      'running'
    );

    this.orchestrator
      .generateDocumentDraft(template, context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.sections.set(result.sections.map(s => ({ ...s })));
          this.citations.set(result.citations);
          this.syncUnifiedFromSections(this.sections());
          this.loading.set(false);
          this.pushTimeline(
            'Agente Redactor Legal',
            `Borradores generados con ${this.modeLabel()}. Revise y apruebe cada cláusula.`,
            'done'
          );
          this.emitSections();
          this.runAudit();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          const message = this.getRequestErrorMessage(error);
          this.generationError.set(message);
          this.pushTimeline('Agente Redactor Legal', `No se pudo obtener la respuesta. ${message}`, 'error');
        },
      });
  }

  retryGeneration(): void {
    this.generateAll();
  }

  reindexCorpus(): void {
    this.indexingCorpus.set(true);
    this.pushTimeline(
      'Agente Redactor Legal',
      'Reindexando el corpus legal (File Search)…',
      'running'
    );
    this.orchestrator
      .reindexKnowledgeBase()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ok => {
        this.indexingCorpus.set(false);
        this.pushTimeline(
          'Agente Redactor Legal',
          ok ? 'Corpus legal reindexado.' : 'No se pudo reindexar el corpus.',
          ok ? 'done' : 'error'
        );
      });
  }

  // ── Edición manual (HITL) ───────────────────────────────────────────
  onEditorContentChange(html: string): void {
    this.editorContent = html ?? '';
    const current = this.sections();
    if (current.length > 0) {
      // Marca la primera sección como editada (el editor es unificado).
      this.sections.update(secs =>
        secs.map((s, i) =>
          i === 0
            ? {
                ...s,
                content: this.editorContent,
                status:
                  s.status === 'APPROVED'
                    ? 'APPROVED'
                    : ('USER_EDITED' as SectionStatus),
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
      this.emitSections();
    }
  }

  approveAll(): void {
    if (
      this.loading() ||
      this.generationError() !== null ||
      this.sections().some(section => section.status === 'PENDING_GENERATION')
    ) {
      return;
    }

    this.sections.update(secs =>
      secs.map(s => ({
        ...s,
        status: 'APPROVED' as SectionStatus,
        updatedAt: new Date().toISOString(),
      }))
    );
    this.pushTimeline(
      'Agente Auditor de Coherencia',
      'Documento completo aprobado por revisión humana.',
      'done'
    );
    this.emitSections();
    this.runAudit();
  }

  approveSection(sectionId: string): void {
    this.sections.update(secs =>
      secs.map(s =>
        s.id === sectionId
          ? { ...s, status: 'APPROVED' as SectionStatus, updatedAt: new Date().toISOString() }
          : s
      )
    );
    const sec = this.sections().find(s => s.id === sectionId);
    this.pushTimeline(
      'Agente Auditor de Coherencia',
      `Sección "${sec?.title ?? ''}" aprobada.`,
      'done'
    );
    this.emitSections();
    this.runAudit();
  }

  // ── Regeneración (diálogo) ──────────────────────────────────────────
  openRegenerateDialog(section: DocumentSection): void {
    this.dialogSection.set(section);
    this.instruction.set('');
    this.regenerationError.set(null);
    this.dialogVisible.set(true);
  }

  closeRegenerateDialog(): void {
    this.dialogVisible.set(false);
    this.dialogSection.set(null);
    this.instruction.set('');
    this.regenerationError.set(null);
  }

  confirmRegenerate(): void {
    const section = this.dialogSection();
    if (!section) return;

    this.regenerating.set(true);
    this.regenerationError.set(null);
    this.pushTimeline(
      'Agente Redactor Legal',
      `Regenerando "${section.title}" con instrucción del revisor…`,
      'running'
    );

    this.orchestrator
      .regenerateSection(section, this.instruction(), this.template(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.sections.update(secs =>
            secs.map(s => (s.id === updated.id ? { ...updated } : s))
          );
          this.citations.set(this.orchestrator.lastCitations());
          this.syncUnifiedFromSections(this.sections());
          this.regenerating.set(false);
          this.pushTimeline(
            'Agente Redactor Legal',
            `"${updated.title}" regenerada. Requiere re-aprobación.`,
            'done'
          );
          this.closeRegenerateDialog();
          this.emitSections();
          this.runAudit();
        },
        error: (error: unknown) => {
          this.regenerating.set(false);
          const message = this.getRequestErrorMessage(error);
          this.regenerationError.set(message);
          this.pushTimeline('Agente Redactor Legal', `No se pudo regenerar la sección. ${message}`, 'error');
        },
      });
  }

  // ── Agente Auditor ──────────────────────────────────────────────────
  runAudit(): void {
    this.auditing.set(true);
    this.orchestrator
      .auditSections(this.sections(), this.context(), this.template())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: alerts => {
          this.auditAlerts.set(alerts);
          this.auditing.set(false);
          this.pushTimeline(
            'Agente Auditor de Coherencia',
            `Auditoría completada: ${alerts.length} observación(es).`,
            'done'
          );
        },
        error: () => this.auditing.set(false),
      });
  }

  // ── Helpers de UI ───────────────────────────────────────────────────
  statusSeverity(status: SectionStatus): TagSeverity {
    switch (status) {
      case 'APPROVED':     return 'success';
      case 'DRAFT_READY':  return 'info';
      case 'USER_EDITED':  return 'warn';
      default:             return 'danger';
    }
  }

  private getRequestErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Ocurrió un error inesperado al contactar el modelo de Google.';
  }

  alertSeverity(severity: AuditSeverity): 'success' | 'info' | 'warn' | 'error' {
    return severity;
  }

  modeSeverity(mode: AiMode): TagSeverity {
    switch (mode) {
      case 'gemini-file-search': return 'success';
      case 'gemini':             return 'info';
      default:                   return 'secondary';
    }
  }

  emitSections(): void {
    this.sectionsChange.emit(this.sections());
  }

  pushTimeline(agent: string, message: string, status: string): void {
    this.timeline.update(t => [
      ...t,
      {
        id: `evt-${Date.now()}`,
        agent: agent as AgentTimelineEvent['agent'],
        message,
        status: status as AgentTimelineEvent['status'],
        timestamp: new Date().toISOString(),
      } satisfies AgentTimelineEvent,
    ]);
  }

  /**
   * Construye el HTML unificado de todas las secciones, lo guarda en
   * `editorContent` y lo escribe directamente en el modelo de Quill para que
   * el editor lo muestre aunque el componente esté en OnPush.
   */
  syncUnifiedFromSections(sections: DocumentSection[]): void {
    const combined = sections
      .map(s => {
        const hasHeader = /<h[1-6]/i.test(s.content ?? '');
        const header = hasHeader ? '' : `<h3>${s.title}</h3>`;
        return `${header}${s.content ?? ''}`;
      })
      .join('<hr/>');

    this.editorContent = combined;
    this.writeToQuill(combined);
    this.cdr.markForCheck();
  }

  /** Escribe HTML directamente en la instancia de Quill (si ya está lista). */
  private writeToQuill(html: string): void {
    const quill = this.editorRef?.quill;
    if (!quill) return;
    const delta = quill.clipboard.convert({ html });
    quill.setContents(delta, 'silent');
  }
}
