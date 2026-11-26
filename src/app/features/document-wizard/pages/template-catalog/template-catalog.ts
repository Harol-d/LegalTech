import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { DocumentCatalogService } from '../../../../core/services/document-catalog.service';
import { AgentOrchestratorService } from '../../../../core/services/agent-orchestrator.service';
import { AiGatewayService } from '../../../../core/services/ai-gateway.service';
import { DocumentTemplate, TemplateCategoryGroup } from '../../../../core/models/document-template.model';
import { AvailableModelItem } from '../../../../core/models/ai.model';

interface ModelOption {
  label: string;
  value: string;
  description: string;
  supportsFileSearch: boolean;
}

/**
 * Pantalla inicial: selección de plantilla legal y configuración de modelo de IA.
 */
@Component({
  selector: 'app-template-catalog',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    SkeletonModule,
    TagModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-catalog.html',
})
export class TemplateCatalog implements OnInit {
  private readonly catalog = inject(DocumentCatalogService);
  private readonly orchestrator = inject(AgentOrchestratorService);
  private readonly aiGateway = inject(AiGatewayService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly groups = toSignal(this.catalog.getTemplatesByCategory(), { initialValue: null });
  readonly loading = computed(() => this.groups() === null);
  readonly categoryGroups = computed<TemplateCategoryGroup[]>(() => this.groups() ?? []);
  readonly totalTemplates = computed(() => this.categoryGroups().reduce((sum, g) => sum + g.templates.length, 0));

  // ---- Modal de configuración de modelo ----
  readonly showConfigDialog = signal(false);
  readonly loadingModels = signal(false);
  readonly savingModel = signal(false);
  readonly configMessage = signal<string | null>(null);
  readonly configError = signal<string | null>(null);

  readonly availableModels = signal<AvailableModelItem[]>([]);
  readonly currentModel = signal<string>('gemini-2.5-flash');
  readonly selectedModel = signal<string>('gemini-2.5-flash');

  readonly modelOptions = computed<ModelOption[]>(() => {
    return this.availableModels().map((m) => ({
      label: `${m.displayName} (${m.name})`,
      value: m.name,
      description: m.description,
      supportsFileSearch: m.supportsFileSearch,
    }));
  });

  readonly selectedModelDetails = computed<AvailableModelItem | undefined>(() => {
    return this.availableModels().find((m) => m.name === this.selectedModel());
  });

  ngOnInit(): void {
    this.loadAiStatus();
  }

  loadAiStatus(): void {
    this.orchestrator.refreshAiStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        if (status) {
          this.currentModel.set(status.model);
          this.selectedModel.set(status.model);
          if (status.availableModels && status.availableModels.length > 0) {
            this.availableModels.set(status.availableModels);
          }
        }
      });
  }

  openConfigDialog(): void {
    this.configMessage.set(null);
    this.configError.set(null);
    this.showConfigDialog.set(true);

    if (this.availableModels().length === 0) {
      this.fetchAvailableModels();
    }
  }

  fetchAvailableModels(): void {
    this.loadingModels.set(true);
    this.aiGateway.getAvailableModels()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.availableModels.set(res.models);
          this.currentModel.set(res.currentModel);
          this.selectedModel.set(res.currentModel);
          this.loadingModels.set(false);
        },
        error: () => {
          this.loadingModels.set(false);
        },
      });
  }

  saveModel(): void {
    const modelToSet = this.selectedModel();
    if (!modelToSet) return;

    this.savingModel.set(true);
    this.configError.set(null);
    this.configMessage.set(null);

    this.orchestrator.changeModel(modelToSet)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (success) => {
          this.savingModel.set(false);
          if (success) {
            this.currentModel.set(modelToSet);
            this.configMessage.set(`Modelo "${modelToSet}" configurado correctamente para generación y File Search.`);
          } else {
            this.configError.set('No se pudo guardar la selección del modelo.');
          }
        },
        error: (err: unknown) => {
          this.savingModel.set(false);
          this.configError.set(err instanceof Error ? err.message : 'Error al guardar el modelo.');
        },
      });
  }

  closeConfigDialog(): void {
    this.showConfigDialog.set(false);
  }

  startWizard(template: DocumentTemplate): void {
    void this.router.navigate(['/wizard', template.id]);
  }

  skeletons(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }
}
