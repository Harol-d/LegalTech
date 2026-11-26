import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { startWith } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';

import { AgentOrchestratorService } from '../../../../core/services/agent-orchestrator.service';
import {
  CompanyLegalType,
  DOCUMENT_TYPES,
  DocumentType,
  LEGAL_ENTITY_TYPES,
  LegalEntityType,
  PARTNER_ROLES,
  PartnerRole,
  StartupContext,
  createEmptyPartner,
  createEmptyStartupContext,
  generateId,
  totalSharePercentage,
} from '../../../../core/models/startup-context.model';

interface SelectOption<T> {
  label: string;
  value: T;
}

const SHARE_EPSILON = 0.01;

/** Validador: la suma de porcentajes accionarios debe ser 100. */
function shareSumValidator(control: AbstractControl): ValidationErrors | null {
  const partners = (control.value ?? []) as { sharePercentage: number }[];
  if (partners.length === 0) {
    return { shareSumNot100: { total: 0 } };
  }
  const total = partners.reduce((sum, p) => sum + (Number(p.sharePercentage) || 0), 0);
  return Math.abs(total - 100) <= SHARE_EPSILON ? null : { shareSumNot100: { total } };
}

/**
 * Paso 1 — Contexto de la Startup (Agente Entrevistador).
 * Formulario reactivo tipado con gestión dinámica de socios y % accionario (p-table).
 */
@Component({
  selector: 'app-step-startup-context',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './step-startup-context.html',
})
export class StepStartupContext {
  private readonly fb = inject(FormBuilder);
  private readonly orchestrator = inject(AgentOrchestratorService);

  /** Emite cuando el formulario es válido y se debe avanzar al Paso 2. */
  readonly contextReady = output<StartupContext>();

  // Opciones de p-select (labels español).
  readonly partnerRoleOptions: SelectOption<PartnerRole>[] = PARTNER_ROLES.map((role) => ({ label: role, value: role }));
  readonly documentTypeOptions: SelectOption<DocumentType>[] = DOCUMENT_TYPES.map((t) => ({ label: t, value: t }));
  readonly entityTypeOptions: SelectOption<LegalEntityType>[] = LEGAL_ENTITY_TYPES.map((t) => ({ label: t, value: t }));
  readonly legalTypeOptions: SelectOption<CompanyLegalType>[] = [
    { label: 'Sociedad por Acciones Simplificada (SAS)', value: 'Sociedad por Acciones Simplificada (SAS)' },
  ];

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    legalName: ['', [Validators.required, Validators.minLength(2)]],
    nit: ['', [Validators.required]],
    legalType: this.fb.nonNullable.control<CompanyLegalType>('Sociedad por Acciones Simplificada (SAS)', Validators.required),
    country: ['Colombia', [Validators.required]],
    city: ['', [Validators.required]],
    address: ['', [Validators.required]],
    corporatePurpose: ['', [Validators.required, Validators.minLength(10)]],
    capitalSocial: [0, [Validators.required, Validators.min(0)]],
    numberOfShares: [0, [Validators.required, Validators.min(1)]],
    shareNominalValue: [0, [Validators.required, Validators.min(0)]],
    corporateEmail: ['', [Validators.email]],
    partners: this.fb.nonNullable.array([this.createPartnerGroup()], shareSumValidator),
  });

  // --- Señales derivadas (sin lógica en el template) ---
  private readonly statusTick = signal(0);
  private readonly partnersSnapshot = signal(this.partners.getRawValue());

  readonly formValid = computed(() => {
    this.statusTick();
    return this.form.valid;
  });

  readonly totalShare = computed(() => totalSharePercentage(this.partnersSnapshot()));
  readonly shareSumOk = computed(() => Math.abs(this.totalShare() - 100) <= SHARE_EPSILON);

  readonly partnerCount = computed(() => this.partnersSnapshot().length);

  constructor() {
    const defaultData = this.orchestrator.getStartupContext() ?? createEmptyStartupContext();
    this.patchFromContext(defaultData);

    this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe(() => this.statusTick.update((v) => v + 1));

    this.partners.valueChanges
      .pipe(startWith(this.partners.getRawValue()), takeUntilDestroyed())
      .subscribe((value: unknown[]) => {
        this.partnersSnapshot.set((value as Record<string, unknown>[]).map((p) => ({ ...p })));
        this.partners.updateValueAndValidity({ emitEvent: false });
        this.statusTick.update((v) => v + 1);
      });

    // Capital social = nº acciones × valor nominal cuando no se edita manualmente.
    this.form.controls.numberOfShares.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.recomputeCapital());
    this.form.controls.shareNominalValue.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.recomputeCapital());
    this.form.controls.capitalSocial.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => (this.capitalManual = true));

    this.form.updateValueAndValidity();
    this.statusTick.update((v) => v + 1);
  }

  get partners(): FormArray {
    return this.form.controls.partners;
  }

  getPartnerGroup(index: number): FormGroup {
    return this.partners.at(index) as FormGroup;
  }

  addPartner(): void {
    const partner = createEmptyPartner();
    this.partners.push(
      this.fb.nonNullable.group({
        id: [partner.id],
        fullName: ['', [Validators.required]],
        entityType: this.fb.nonNullable.control<LegalEntityType>('Persona Natural', Validators.required),
        documentType: this.fb.nonNullable.control<DocumentType>('Cédula de Ciudadanía', Validators.required),
        documentNumber: ['', [Validators.required]],
        role: this.fb.nonNullable.control<PartnerRole>('Socio de Capital', Validators.required),
        sharePercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        email: ['', [Validators.email]],
        phone: [''],
      }),
    );
  }

  removePartner(index: number): void {
    if (this.partners.length <= 1) {
      return; // siempre al menos un socio
    }
    this.partners.removeAt(index);
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.partners.updateValueAndValidity();
    if (!this.form.valid) {
      return;
    }
    const context = this.buildContext();
    this.orchestrator.setStartupContext(context); // persistir en memoria/estado del servicio
    this.contextReady.emit(context);
  }

  // --- internos ---

  private capitalManual = false;

  private recomputeCapital(): void {
    if (this.capitalManual) {
      return; // no pisar capital si el usuario lo editó a mano
    }
    const shares = Number(this.form.controls.numberOfShares.value) || 0;
    const nominal = Number(this.form.controls.shareNominalValue.value) || 0;
    this.form.controls.capitalSocial.setValue(shares * nominal, { emitEvent: false });
  }

  private createPartnerGroup() {
    const partner = createEmptyPartner();
    return this.fb.nonNullable.group({
      id: [partner.id],
      fullName: ['', [Validators.required]],
      entityType: this.fb.nonNullable.control<LegalEntityType>('Persona Natural', Validators.required),
      documentType: this.fb.nonNullable.control<DocumentType>('Cédula de Ciudadanía', Validators.required),
      documentNumber: ['', [Validators.required]],
      role: this.fb.nonNullable.control<PartnerRole>('Socio Administrador', Validators.required),
      sharePercentage: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
      email: ['', [Validators.email]],
      phone: [''],
    });
  }

  private buildContext(): StartupContext {
    const raw = this.form.getRawValue();
    return {
      companyName: raw.companyName.trim(),
      legalName: raw.legalName.trim(),
      nit: raw.nit.trim(),
      legalType: raw.legalType,
      country: raw.country.trim() || 'Colombia',
      city: raw.city.trim(),
      address: raw.address.trim(),
      corporatePurpose: raw.corporatePurpose.trim(),
      capitalSocial: Number(raw.capitalSocial) || 0,
      numberOfShares: Number(raw.numberOfShares) || 0,
      shareNominalValue: Number(raw.shareNominalValue) || 0,
      corporateEmail: raw.corporateEmail.trim(),
      partners: raw.partners.map((p) => ({
        id: p['id'] ? String(p['id']) : generateId('partner'),
        fullName: String(p['fullName'] ?? '').trim(),
        entityType: (p['entityType'] as LegalEntityType) ?? 'Persona Natural',
        documentType: (p['documentType'] as DocumentType) ?? 'Cédula de Ciudadanía',
        documentNumber: String(p['documentNumber'] ?? '').trim(),
        role: (p['role'] as PartnerRole) ?? 'Socio de Capital',
        sharePercentage: Number(p['sharePercentage']) || 0,
        email: String(p['email'] ?? '').trim(),
        phone: String(p['phone'] ?? '').trim(),
      })),
    };
  }

  private patchFromContext(ctx: StartupContext): void {
    this.form.patchValue({
      companyName: ctx.companyName,
      legalName: ctx.legalName,
      nit: ctx.nit,
      legalType: ctx.legalType,
      country: ctx.country,
      city: ctx.city,
      address: ctx.address,
      corporatePurpose: ctx.corporatePurpose,
      capitalSocial: ctx.capitalSocial,
      numberOfShares: ctx.numberOfShares,
      shareNominalValue: ctx.shareNominalValue,
      corporateEmail: ctx.corporateEmail,
    });

    this.partners.clear();
    for (const p of ctx.partners) {
      this.partners.push(
        this.fb.nonNullable.group({
          id: [p.id],
          fullName: [p.fullName, [Validators.required]],
          entityType: this.fb.nonNullable.control<LegalEntityType>(p.entityType, Validators.required),
          documentType: this.fb.nonNullable.control<DocumentType>(p.documentType, Validators.required),
          documentNumber: [p.documentNumber, [Validators.required]],
          role: this.fb.nonNullable.control<PartnerRole>(p.role, Validators.required),
          sharePercentage: [p.sharePercentage, [Validators.required, Validators.min(0), Validators.max(100)]],
          email: [p.email, [Validators.email]],
          phone: [p.phone],
        }),
      );
    }
    if (this.partners.length === 0) {
      this.addPartner();
    }
  }
}
