/**
 * Datos maestros de la startup y sus socios (Paso 1 del Wizard).
 * Todos los identificadores y claves en inglés; los valores visibles en español.
 */

/** Tipo de documento de identidad según el Registro Único Tributario (RUT) colombiano. */
export type DocumentType =
  | 'Cédula de Ciudadanía'
  | 'Cédula de Extranjería'
  | 'Pasaporte'
  | 'NIT'
  | 'Permiso por Protección Temporal';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'Cédula de Ciudadanía',
  'Cédula de Extranjería',
  'Pasaporte',
  'NIT',
  'Permiso por Protección Temporal',
] as const;

/** Rol del socio dentro de la sociedad. */
export type PartnerRole =
  | 'Socio Administrador'
  | 'Socio de Capital'
  | 'Socio de Trabajo'
  | 'Socio Industrial'
  | 'Socio Técnico'
  | 'Representante Legal'
  | 'Representante Legal Suplente';

export const PARTNER_ROLES: readonly PartnerRole[] = [
  'Socio Administrador',
  'Socio de Capital',
  'Socio de Trabajo',
  'Socio Industrial',
  'Socio Técnico',
  'Representante Legal',
  'Representante Legal Suplente',
] as const;

/** Naturaleza jurídica del socio. */
export type LegalEntityType = 'Persona Natural' | 'Persona Jurídica';

export const LEGAL_ENTITY_TYPES: readonly LegalEntityType[] = [
  'Persona Natural',
  'Persona Jurídica',
] as const;

/** Socio de la startup. */
export interface Partner {
  /** Identificador interno único. */
  id: string;
  /** Nombre completo (persona natural) o razón social (persona jurídica). */
  fullName: string;
  entityType: LegalEntityType;
  documentType: DocumentType;
  documentNumber: string;
  role: PartnerRole;
  /** Porcentaje de participación accionaria (0-100). La suma total debe ser 100. */
  sharePercentage: number;
  email: string;
  phone: string;
}

/** Tipo societario. Release 1 se enfoca en SAS. */
export type CompanyLegalType = 'Sociedad por Acciones Simplificada (SAS)';

/** Datos maestros de la startup. */
export interface StartupContext {
  /** Nombre comercial. */
  companyName: string;
  /** Razón social. */
  legalName: string;
  /** NIT (sin dígito de verificación o con él, formato libre). */
  nit: string;
  legalType: CompanyLegalType;
  /** País. Por defecto 'Colombia'. */
  country: string;
  /** Ciudad de domicilio social. */
  city: string;
  /** Dirección del domicilio social. */
  address: string;
  /** Objeto social. */
  corporatePurpose: string;
  /** Capital social inicial en pesos colombianos (COP). */
  capitalSocial: number;
  /** Número total de acciones. */
  numberOfShares: number;
  /** Valor nominal por acción en COP. */
  shareNominalValue: number;
  /** Correo corporativo. */
  corporateEmail: string;
  /** Socios. */
  partners: Partner[];
}

/** Suma de los porcentajes accionarios de los socios. */
export function totalSharePercentage(partners: readonly Partner[]): number {
  return partners.reduce((sum, partner) => sum + (Number(partner.sharePercentage) || 0), 0);
}

/** Contexto por defecto prellenado con datos válidos de startup colombiana. */
export function createEmptyStartupContext(): StartupContext {
  return {
    companyName: 'TechNova Colombia',
    legalName: 'TechNova Solutions S.A.S.',
    nit: '901.845.321-7',
    legalType: 'Sociedad por Acciones Simplificada (SAS)',
    country: 'Colombia',
    city: 'Bogotá D.C.',
    address: 'Calle 93B # 13-45 Oficina 502',
    corporatePurpose:
      'Desarrollo, comercialización, licenciamiento e implementación de software, plataformas tecnológicas, soluciones de inteligencia artificial y servicios de consultoría digital.',
    capitalSocial: 10_000_000,
    numberOfShares: 1_000,
    shareNominalValue: 10_000,
    corporateEmail: 'contacto@technova.co',
    partners: [
      {
        id: generateId('partner'),
        fullName: 'Alejandro Morales Gómez',
        entityType: 'Persona Natural',
        documentType: 'Cédula de Ciudadanía',
        documentNumber: '1018452391',
        role: 'Representante Legal',
        sharePercentage: 60,
        email: 'alejandro@technova.co',
        phone: '+57 311 456 7890',
      },
      {
        id: generateId('partner'),
        fullName: 'Camila Restrepo Silva',
        entityType: 'Persona Natural',
        documentType: 'Cédula de Ciudadanía',
        documentNumber: '1032894512',
        role: 'Representante Legal Suplente',
        sharePercentage: 40,
        email: 'camila@technova.co',
        phone: '+57 320 892 1234',
      },
    ],
  };
}

/** Socio vacío. */
export function createEmptyPartner(): Partner {
  return {
    id: generateId('partner'),
    fullName: '',
    entityType: 'Persona Natural',
    documentType: 'Cédula de Ciudadanía',
    documentNumber: '',
    role: 'Socio Administrador',
    sharePercentage: 0,
    email: '',
    phone: '',
  };
}

/** Identificador único simple (sin dependencias externas). */
export function generateId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
