import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepStartupContext } from './step-startup-context';
import { StartupContext } from '../../../../core/models/startup-context.model';

describe('StepStartupContext', () => {
  let fixture: ComponentFixture<StepStartupContext>;
  let component: StepStartupContext;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepStartupContext] }).compileComponents();
    fixture = TestBed.createComponent(StepStartupContext);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates with one partner', () => {
    expect(component).toBeTruthy();
    expect(component.partners.length).toBe(1);
  });

  it('renders a PrimeNG table for partners', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('table')).toBeTruthy();
    expect(el.querySelector('p-table')).toBeTruthy();
  });

  it('validates share sum to 100%', () => {
    component.partners.at(0).patchValue({ fullName: 'Socio Uno', documentNumber: '1', sharePercentage: 100 });
    component.form.patchValue({
      companyName: 'Mi Startup',
      legalName: 'Mi Startup S.A.S.',
      nit: '901234567-8',
      city: 'Bogotá',
      address: 'Calle 1',
      corporatePurpose: 'Desarrollo de software para startups.',
      numberOfShares: 100,
      shareNominalValue: 100,
    });
    component.form.updateValueAndValidity();
    fixture.detectChanges();

    expect(component.totalShare()).toBe(100);
    expect(component.shareSumOk()).toBe(true);
    expect(component.formValid()).toBe(true);
  });

  it('blocks when share sum is not 100%', () => {
    component.partners.at(0).patchValue({ sharePercentage: 60 });
    component.form.updateValueAndValidity();
    fixture.detectChanges();
    expect(component.totalShare()).toBe(60);
    expect(component.shareSumOk()).toBe(false);
    expect(component.formValid()).toBe(false);
  });

  it('emits context and persists on submit', () => {
    component.partners.at(0).patchValue({ fullName: 'Socio Uno', documentNumber: '1', sharePercentage: 100 });
    component.form.patchValue({
      companyName: 'Mi Startup',
      legalName: 'Mi Startup S.A.S.',
      nit: '901234567-8',
      city: 'Bogotá',
      address: 'Calle 1',
      corporatePurpose: 'Desarrollo de software para startups.',
      numberOfShares: 100,
      shareNominalValue: 100,
    });
    component.form.updateValueAndValidity();

    let emitted: StartupContext | undefined;
    component.contextReady.subscribe((ctx) => (emitted = ctx));
    component.submit();

    expect(emitted).toBeTruthy();
    expect(emitted?.partners[0].sharePercentage).toBe(100);
  });

  it('can add and remove partners', () => {
    component.addPartner();
    expect(component.partners.length).toBe(2);
    component.removePartner(1);
    expect(component.partners.length).toBe(1);
  });
});
