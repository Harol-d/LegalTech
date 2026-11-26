import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AiGatewayError, AiGatewayService } from './ai-gateway.service';
import { DocumentTemplate } from '../models/document-template.model';
import { DocumentSection } from '../models/agent-workflow.model';
import { StartupContext, createEmptyStartupContext } from '../models/startup-context.model';

const TEMPLATE: DocumentTemplate = {
  id: 'tpl',
  name: 'Plantilla de prueba',
  category: 'Constitución y Registro',
  description: '',
  legalBasis: ['Ley 1429 de 2010'],
  sections: [{ id: 'objeto-social', title: 'Objeto social', guidance: 'g', legalBasis: 'Código de Comercio art. 443' }],
};

function contextWithShares(total: number): StartupContext {
  const ctx = createEmptyStartupContext();
  ctx.companyName = 'Demo';
  ctx.legalName = 'Demo SAS';
  ctx.nit = '901';
  ctx.city = 'Bogotá';
  ctx.corporatePurpose = 'Desarrollo de software.';
  ctx.partners = [
    { ...ctx.partners[0], fullName: 'Socio', documentNumber: '1', sharePercentage: total },
  ];
  return ctx;
}

describe('AgentOrchestratorService', () => {
  let service: AgentOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgentOrchestratorService);
  });

  it('persists startup context in memory', () => {
    const ctx = contextWithShares(100);
    service.setStartupContext(ctx);
    expect(service.getStartupContext()?.legalName).toBe('Demo SAS');
    service.clearStartupContext();
    expect(service.getStartupContext()).toBeNull();
  });

  it('uses the gateway response to generate a DRAFT_READY section', async () => {
    vi.spyOn(TestBed.inject(AiGatewayService), 'draftSection').mockReturnValue(
      of({
        section: {
          id: 'section-objeto-social',
          templateSectionId: 'objeto-social',
          title: 'Objeto social',
          content: '<p>Generado por Gemini</p>',
          status: 'DRAFT_READY',
          updatedAt: new Date().toISOString(),
        },
        citations: [],
        mode: 'gemini',
      }),
    );

    const section = await firstValueFrom(service.generateSectionDraft(TEMPLATE.sections[0], TEMPLATE, contextWithShares(100)));
    expect(section.status).toBe('DRAFT_READY');
    expect(section.title).toBe('Objeto social');
    expect(section.content).toContain('Generado por Gemini');
  });

  it('does not create local drafts when the API key is missing', async () => {
    await expect(
      firstValueFrom(service.generateDocumentDraft(TEMPLATE, contextWithShares(100))),
    ).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });

    await expect(
      firstValueFrom(
        service.regenerateSection(
          {
            id: 'section-objeto-social',
            templateSectionId: 'objeto-social',
            title: 'Objeto social',
            content: '<p>Borrador previo</p>',
            status: 'DRAFT_READY',
            updatedAt: new Date().toISOString(),
          },
          '',
          TEMPLATE,
          contextWithShares(100),
        ),
      ),
    ).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  });

  it('propagates quota errors instead of substituting a local draft', async () => {
    vi.spyOn(TestBed.inject(AiGatewayService), 'draftDocument').mockReturnValue(
      throwError(() => new AiGatewayError('Se alcanzó el límite de cuota.', 'AI_QUOTA_LIMIT')),
    );

    await expect(
      firstValueFrom(service.generateDocumentDraft(TEMPLATE, contextWithShares(100))),
    ).rejects.toThrow('Se alcanzó el límite de cuota.');
  });

  it('audit flags share sum not 100%', async () => {
    const sections: DocumentSection[] = [
      { id: 's1', templateSectionId: 'x', title: 'X', content: '<p>texto</p>', status: 'APPROVED', updatedAt: '' },
    ];
    const alerts = await firstValueFrom(service.auditSections(sections, contextWithShares(60), TEMPLATE));
    const shareAlert = alerts.find((a) => a.category === 'Suma de Porcentajes');
    expect(shareAlert?.severity).toBe('warn');
    expect(shareAlert?.message).toContain('100');
  });

  it('audit passes share sum at 100%', async () => {
    const sections: DocumentSection[] = [
      { id: 's1', templateSectionId: 'x', title: 'X', content: '<p>texto</p>', status: 'APPROVED', updatedAt: '' },
    ];
    const alerts = await firstValueFrom(service.auditSections(sections, contextWithShares(100), TEMPLATE));
    const shareAlert = alerts.find((a) => a.category === 'Suma de Porcentajes');
    expect(shareAlert?.severity).toBe('success');
  });
});
