import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map, startWith, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { StepperModule } from 'primeng/stepper';

import { DocumentCatalogService } from '../../../../core/services/document-catalog.service';
import { DocumentTemplate } from '../../../../core/models/document-template.model';
import { StartupContext } from '../../../../core/models/startup-context.model';
import { DocumentSection } from '../../../../core/models/agent-workflow.model';

import { StepStartupContext } from '../../components/step-startup-context/step-startup-context';
import { StepAgentReview } from '../../components/step-agent-review/step-agent-review';
import { StepFinalPreview } from '../../components/step-final-preview/step-final-preview';

/**
 * Orquestador del flujo con `p-stepper` lineal de 3 pasos (HITL).
 */
@Component({
  selector: 'app-wizard-workspace',
  standalone: true,
  imports: [
    ButtonModule,
    CardModule,
    MessageModule,
    SkeletonModule,
    StepperModule,
    StepStartupContext,
    StepAgentReview,
    StepFinalPreview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wizard-workspace.html',
})
export class WizardWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(DocumentCatalogService);

  readonly currentStep = signal<number>(1);

  private readonly templateState = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('templateId') ?? ''),
      filter((id) => id.length > 0),
      switchMap((id) => this.catalog.getTemplateById(id)),
      map((template) => ({ template: template ?? null, loaded: true })),
      startWith({ template: null as DocumentTemplate | null, loaded: false }),
    ),
    { initialValue: { template: null as DocumentTemplate | null, loaded: false } },
  );

  readonly template = computed<DocumentTemplate | null>(() => this.templateState().template);
  readonly loadingTemplate = computed<boolean>(() => !this.templateState().loaded);

  /** Contexto de la startup (Paso 1). */
  readonly startupContext = signal<StartupContext | null>(null);

  /** Secciones redactadas (Paso 2 -> Paso 3). */
  readonly sections = signal<DocumentSection[]>([]);

  /** Regla de bloqueo: Paso 3 requiere el 100% de secciones APPROVED. */
  readonly canAdvanceToStep3 = computed(
    () => this.sections().length > 0 && this.sections().every((s) => s.status === 'APPROVED'),
  );

  readonly approvedCount = computed(() => this.sections().filter((s) => s.status === 'APPROVED').length);

  // --- navegación ---

  onStep1Ready(context: StartupContext): void {
    this.startupContext.set(context);
    this.goToStep(2);
  }

  onSectionsChange(sections: DocumentSection[]): void {
    this.sections.set(sections);
  }

  goToStep(step: number): void {
    if (step === 3 && !this.canAdvanceToStep3()) {
      return; // bloqueo HITL
    }
    this.currentStep.set(step);
  }

  onStepChange(value: number | string | undefined): void {
    const step = typeof value === 'string' ? Number(value) : (value ?? 1);
    this.goToStep(step);
  }

  backToCatalog(): void {
    void this.router.navigate(['/']);
  }
}
