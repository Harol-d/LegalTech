import { DocumentTemplate } from '../models/document-template.model';

/**
 * Catálogo de 9 plantillas legales validadas para startups en Colombia,
 * agrupadas en 3 categorías. Textos visibles en español; código en inglés.
 *
 * NOTA: El contenido generado por los agentes es un borrador asistido que
 * requiere revisión humana (Human-in-the-Loop) y validación por un abogado.
 */

export const LEGAL_TEMPLATES: readonly DocumentTemplate[] = [
  // ----------------------------------------------------------------------
  // 1. Constitución y Registro
  // ----------------------------------------------------------------------
  {
    id: 'estatutos-sociales-sas',
    name: 'Estatutos Sociales SAS (Documento privado de constitución)',
    category: 'Constitución y Registro',
    description:
      'Documento privado de constitución de una Sociedad por Acciones Simplificada (SAS) para inscripción en Cámara de Comercio.',
    legalBasis: [
      'Ley 1429 de 2010 (Sociedad por Acciones Simplificada SAS)',
      'Código de Comercio, arts. 437-460 (sociedades anónimas) y 673-685 (sociedades por acciones simplificadas)',
      'Código Civil (sociedades)',
      'Ley 1258 de 2008 (Representante Legal)',
      'Ley 222 de 1995 (régimen laboral de socios trabajadores)',
    ],
    sections: [
      {
        id: 'nombre-razon-social',
        title: 'Nombre y razón social',
        guidance: 'Indicar nombre comercial y razón social con la designación "SAS".',
        legalBasis: 'Código de Comercio art. 441; Ley 1429 art. 10',
      },
      {
        id: 'domicilio',
        title: 'Domicilio social',
        guidance: 'Fijar ciudad y dirección del domicilio social en Colombia.',
        legalBasis: 'Código de Comercio art. 440',
      },
      {
        id: 'duracion',
        title: 'Duración de la sociedad',
        guidance: 'Indicar plazo de duración o sociedad por tiempo indefinido.',
        legalBasis: 'Código de Comercio art. 442',
      },
      {
        id: 'objeto-social',
        title: 'Objeto social',
        guidance: 'Describir las actividades económicas y finalidades lícitas de la sociedad.',
        legalBasis: 'Código de Comercio art. 443',
      },
      {
        id: 'capital-social',
        title: 'Capital social, acciones y valor nominal',
        guidance: 'Fijar capital social inicial, número de acciones, valor nominal y aportes de los socios.',
        legalBasis: 'Código de Comercio arts. 446-452; Ley 1429 art. 10',
      },
      {
        id: 'capital-autorizado',
        title: 'Capital autorizado para futuras emisiones',
        guidance: 'Autorizar emisión de acciones adicionales sin reforma estatutaria (opcional).',
        legalBasis: 'Código de Comercio art. 450',
      },
      {
        id: 'socios',
        title: 'Socios, acciones y aportes',
        guidance: 'Listar socios, porcentaje accionario (suma 100%) y forma de aporte.',
        legalBasis: 'Código de Comercio arts. 446-447',
      },
      {
        id: 'administracion',
        title: 'Administración: Representante Legal y Suplente',
        guidance: 'Designar Representante Legal y Suplente; facultades y duración del cargo.',
        legalBasis: 'Código de Comercio art. 444; Ley 1429 art. 11; Ley 1258 de 2008',
      },
      {
        id: 'organos-sociales',
        title: 'Órganos sociales',
        guidance: 'Regular Asamblea General de Accionistas y Junta Directiva (si se crea).',
        legalBasis: 'Código de Comercio arts. 465-491; Ley 1429 art. 11',
      },
      {
        id: 'asamblea-general',
        title: 'Asamblea General: convocatoria, quórum y mayorías',
        guidance: 'Reglas de convocatoria, quórum de instalación y mayorías ordinarias.',
        legalBasis: 'Código de Comercio arts. 467-471; Ley 1429',
      },
      {
        id: 'asamblea-especial',
        title: 'Mayoría calificada y asamblea especial',
        guidance: 'Definir decisiones que requieren mayoría calificada y asamblea especial.',
        legalBasis: 'Código de Comercio art. 468; Ley 1429',
      },
      {
        id: 'distribucion-utilidades',
        title: 'Distribución de utilidades y reservas',
        guidance: 'Reglar destino de excedentes, reserva legal y dividendos.',
        legalBasis: 'Código de Comercio art. 454; Ley 1429',
      },
      {
        id: 'cesion-acciones',
        title: 'Cesión y transmisión de acciones; derecho de preferencia',
        guidance: 'Regular transmisión entre socios, terceros, pactos de retención y derecho de preferencia.',
        legalBasis: 'Código de Comercio art. 479; Ley 1429',
      },
      {
        id: 'disolucion-liquidacion',
        title: 'Disolución y liquidación',
        guidance: 'Causales de disolución, liquidación y destino del remanente.',
        legalBasis: 'Código de Comercio arts. 502-511; Ley 1429',
      },
      {
        id: 'regimen-laboral',
        title: 'Régimen de socios trabajadores',
        guidance: 'Aclarar régimen laboral de socios trabajadores vs. socios de capital (Ley 222 de 1995).',
        legalBasis: 'Ley 222 de 1995; Ley 50 de 1990 art. 29',
      },
    ],
  },
  {
    id: 'cartas-aceptacion-cargos',
    name: 'Cartas de Aceptación de Cargos (Representante Legal y Suplente)',
    category: 'Constitución y Registro',
    description:
      'Cartas de aceptación de cargo del Representante Legal y del Representante Legal Suplente, requeridas para inscripción en Cámara de Comercio.',
    legalBasis: [
      'Código de Comercio art. 444',
      'Ley 1429 de 2010 art. 11',
      'Ley 1258 de 2008 (ejercicio del cargo de Representante Legal)',
      'Ley 222 de 1995 (socios administradores)',
    ],
    sections: [
      {
        id: 'carta-representante-legal',
        title: 'Carta de Aceptación de Cargo — Representante Legal',
        guidance: 'Carta del socio designado como Representante Legal aceptando el cargo, con datos de identificación y facultades.',
        legalBasis: 'Código de Comercio art. 444; Ley 1258 de 2008 art. 4',
      },
      {
        id: 'carta-representante-suplente',
        title: 'Carta de Aceptación de Cargo — Representante Legal Suplente',
        guidance: 'Carta del socio designado como Representante Legal Suplente aceptando el cargo y sus funciones.',
        legalBasis: 'Código de Comercio art. 444; Ley 1429 art. 11',
      },
      {
        id: 'facultades',
        title: 'Facultades y limitaciones',
        guidance: 'Enumerar facultades de representación y limitaciones (p. ej. gravámenes, litigios, disposición de bienes).',
        legalBasis: 'Código de Comercio art. 444',
      },
      {
        id: 'duracion-revocacion',
        title: 'Duración y revocación del cargo',
        guidance: 'Indicar duración del cargo, renovación y procedimiento de revocación.',
        legalBasis: 'Código de Comercio art. 444; Ley 1258 de 2008',
      },
      {
        id: 'conflictos-interes',
        title: 'Conflictos de interés y responsabilidad',
        guidance: 'Declaración de ausencia de conflictos de interés y responsabilidad del representante.',
        legalBasis: 'Código de Comercio; Ley 1429 art. 11',
      },
    ],
  },
  {
    id: 'guia-diligenciamiento-rues-rub',
    name: 'Guía de Diligenciamiento RUES y Reporte RUB (Beneficiarios Finales)',
    category: 'Constitución y Registro',
    description:
      'Guía paso a paso para diligenciar el Registro Único Empresarial y Social (RUES) en Cámara de Comercio y reportar Beneficiarios Finales (RUB).',
    legalBasis: [
      'Ley 975 de 2005 (RUES)',
      'Resolución 126 de 2014 de la Cámara de Comercio (modelo RUES)',
      'Ley 1783 de 2016 (Registro Único de Beneficiarios Finales - RUB)',
      'Decreto 2131 de 2016 (reglamenta Ley 1783)',
      'Ley 1429 de 2010 art. 23 (reporte de beneficiarios finales)',
    ],
    sections: [
      {
        id: 'introduccion',
        title: 'Introducción y alcance',
        guidance: 'Explicar qué es RUES y RUB y quiénes deben diligenciar.',
      },
      {
        id: 'requisitos-previos',
        title: 'Requisitos previos',
        guidance: 'Listar documentos y datos necesarios antes de iniciar.',
      },
      {
        id: 'rues-paso-a-paso',
        title: 'RUES: diligenciamiento paso a paso',
        guidance: 'Inscribir matrícula mercantil, renovar anualmente y actualizar cambios.',
        legalBasis: 'Ley 975 de 2005; Resolución 126 de 2014',
      },
      {
        id: 'reporte-rub',
        title: 'Reporte RUB: beneficiarios finales',
        guidance:
          'Identificar beneficiarios finales (>25% participación o control) y reportarlos en el RUB; personas naturales con control indirecto.',
        legalBasis: 'Ley 1783 de 2016; Decreto 2131 de 2016; Ley 1429 art. 23',
      },
      {
        id: 'documentos-soporte',
        title: 'Documentos soporte',
        guidance: 'Listar soportes a cargar (cédulas, NIT, estatutos, certificaciones, comprobantes de pago).',
      },
      {
        id: 'plazos',
        title: 'Plazos y obligaciones permanentes',
        guidance: 'Plazos de inscripción, renovación anual y actualización dentro de los 30 días de cambios.',
      },
      {
        id: 'anexos',
        title: 'Anexos y modelos',
        guidance: 'Referenciar anexos y modelos oficiales.',
      },
    ],
  },

  // ----------------------------------------------------------------------
  // 2. Socios e Inversión
  // ----------------------------------------------------------------------
  {
    id: 'acuerdo-accionistas',
    name: 'Acuerdo de Accionistas (Pacto de Socios)',
    category: 'Socios e Inversión',
    description:
      'Pacto de socios que regula aportes, participación, gobierno corporativo, transmisión de acciones y salida de socios.',
    legalBasis: [
      'Código de Comercio (sociedades; art. 479 cesión de acciones)',
      'Ley 1429 de 2010 (SAS)',
      'Código Civil (contratos)',
      'Decreto 2466 de 2012 (contratos internacionales)',
      'Ley 1581 de 2012 (datos personales)',
    ],
    sections: [
      { id: 'partes', title: 'Partes', guidance: 'Identificar a los accionistas parte del acuerdo.' },
      { id: 'antecedentes-objeto', title: 'Antecedentes y objeto', guidance: 'Antecedentes de la sociedad y objeto del pacto.' },
      { id: 'aportes', title: 'Aportes de capital', guidance: 'Aportes realizados y compromisos de aporte futuro.', legalBasis: 'Código de Comercio arts. 446-447' },
      { id: 'participacion', title: 'Participación accionaria', guidance: 'Porcentajes accionarios (suma 100%); clases de acciones.' },
      { id: 'gobierno-corporativo', title: 'Gobierno corporativo y votación', guidance: 'Órganos, derechos de voto, mayorías ordinarias y calificadas.', legalBasis: 'Código de Comercio arts. 465-491' },
      { id: 'decisiones-reservadas', title: 'Decisiones reservadas', guidance: 'Lista de decisiones que requieren aprobación unánime o de accionistas específicos.' },
      { id: 'derechos-preferentes', title: 'Derechos preferentes', guidance: 'Derechos preferentes de información, voto o participación.' },
      { id: 'pacto-no-competencia', title: 'Pacto de no competencia y no solicitud', guidance: 'No competencia, no solicitud de empleados, no uso de información.' },
      { id: 'confidencialidad', title: 'Confidencialidad', guidance: 'Obligación de confidencialidad de la información societaria.', legalBasis: 'Ley 1581 de 2012' },
      { id: 'vesting', title: 'Vesting y consolidación', guidance: 'Consolidación progresiva de acciones de socios trabajadores (opcional).' },
      { id: 'transmision-acciones', title: 'Transmisión de acciones; preferencia; drag-along; tag-along', guidance: 'Reglas de transmisión, derecho de preferencia, acciones de arrastre y etiqueta.', legalBasis: 'Código de Comercio art. 479' },
      { id: 'causales-salida', title: 'Causales de salida; good leaver / bad leaver', guidance: 'Causales de salida, valoración y recompra.' },
      { id: 'nueva-emision', title: 'Nueva emisión y dilución', guidance: 'Derechos de preferencia en nuevas emisiones; antidilución.' },
      { id: 'disolucion', title: 'Disolución y liquidación', guidance: 'Causales de disolución y liquidación.', legalBasis: 'Código de Comercio arts. 502-511' },
      { id: 'ley-aplicable', title: 'Ley aplicable; jurisdicción; arbitraje', guidance: 'Ley colombiana; jurisdicción; arbitramento.', legalBasis: 'Ley 1563 de 2012 (arbitraje comercial)' },
      { id: 'disposiciones-generales', title: 'Disposiciones generales', guidance: 'Acuerdo integral, modificaciones, notificaciones, anexos.' },
    ],
  },
  {
    id: 'contrato-vesting',
    name: 'Contrato de Vesting (con cliff y cronograma de consolidación)',
    category: 'Socios e Inversión',
    description:
      'Contrato de vesting de acciones para socios/fundadores con período de carencia (cliff) y cronograma de consolidación, y reglas de salida.',
    legalBasis: [
      'Código de Comercio arts. 479 (cesión), 444 (representación)',
      'Código Civil (contratos; resolución; nulidad)',
      'Ley 1429 de 2010 (SAS)',
      'Ley 222 de 1995 (socios trabajadores)',
      'Ley 1563 de 2012 (arbitraje comercial)',
    ],
    sections: [
      { id: 'partes', title: 'Partes', guidance: 'Sociedad y socio/beneficiario; socio fundador.' },
      { id: 'objeto', title: 'Objeto', guidance: 'Consolidación progresiva de acciones y recompra si se incumple.' },
      { id: 'acciones-objeto', title: 'Acciones objeto; precio de retorno', guidance: 'Acciones sujetas a vesting; precio de recompra (valor nominal/pagado).' },
      { id: 'cliff', title: 'Cliff (período de carencia)', guidance: 'Carencia inicial; si se retira antes, pierde acciones no consolidadas y recompra a precio pagado.' },
      { id: 'consolidacion', title: 'Cronograma de consolidación', guidance: 'Vesting progresivo (p. ej. 25% por año / mensual); tiempo trabajado.' },
      { id: 'eventos-aceleracion', title: 'Eventos que aceleran la consolidación', guidance: 'Causales de aceleración total o parcial (ej. venta de la empresa, fallecimiento, incapacidad).' },
      { id: 'salida-good-leaver', title: 'Causales de salida: good leaver', guidance: 'Salida voluntaria, despido sin justa causa, renuncia por causas no imputables.' },
      { id: 'salida-bad-leaver', title: 'Causales de salida: bad leaver', guidance: 'Justa causa, incumplimiento, violación de confidencialidad; pérdida de acciones no consolidadas.' },
      { id: 'recompra', title: 'Derecho de recompra y procedimiento', guidance: 'Quién recompra; precio; plazo; pago; derecho de preferencia.', legalBasis: 'Código de Comercio art. 479' },
      { id: 'confidencialidad-ip', title: 'Confidencialidad y propiedad intelectual', guidance: 'Cesión de PI; confidencialidad; no uso de activos tras salida.' },
      { id: 'ley-aplicable', title: 'Ley aplicable; jurisdicción; arbitraje', guidance: 'Ley colombiana; arbitramento.', legalBasis: 'Ley 1563 de 2012' },
      { id: 'disposiciones-generales', title: 'Disposiciones generales', guidance: 'Acuerdo integral; modificaciones; notificaciones.' },
    ],
  },
  {
    id: 'contrato-cesion-propiedad-intelectual',
    name: 'Contrato de Cesión de Propiedad Intelectual (IP Assignment)',
    category: 'Socios e Inversión',
    description:
      'Contrato de cesión de derechos patrimoniales de propiedad intelectual (obras, invenciones, software, marcas, bases de datos) a la startup.',
    legalBasis: [
      'Código de Comercio arts. 2610-2614 (derecho de autor mercantil; cesión)',
      'Decisión 351 de 1993 de la CAN (propiedad industrial)',
      'Ley 1450 de 2011 (reglamenta PI; titularidad en relación de trabajo)',
      'Decreto 2685 de 1999 (Decreto Único de Propiedad Intelectual)',
      'Ley 23 de 1982',
    ],
    sections: [
      { id: 'partes', title: 'Partes', guidance: 'Cedente(s) y cesionario.' },
      { id: 'antecedentes-objeto', title: 'Antecedentes y objeto', guidance: 'Antecedentes; cesión de derechos patrimoniales.' },
      { id: 'obras-cedidas', title: 'Obras y creaciones objeto de cesión', guidance: 'Obras literarias, software, documentación, diseños, bases de datos.', legalBasis: 'Código de Comercio art. 2610' },
      { id: 'invenciones', title: 'Invenciones, patentes y modelos de utilidad', guidance: 'Invenciones; patentes; modelos de utilidad; diseños industriales; secretos empresariales.', legalBasis: 'Decisión 351 CAN' },
      { id: 'marcas', title: 'Marcas, nombres comerciales y logotipos', guidance: 'Cesión/licencia de marcas y signos distintivos.', legalBasis: 'Decisión 351 CAN' },
      { id: 'software', title: 'Software y código fuente', guidance: 'Código fuente; documentación; especificaciones; versiones; repositorios.', legalBasis: 'Código de Comercio art. 2610; Ley 23 de 1982' },
      { id: 'bases-datos', title: 'Bases de datos y know-how', guidance: 'Bases de datos; conocimiento técnico; know-how.', legalBasis: 'Código de Comercio art. 2614' },
      { id: 'derechos-cedidos', title: 'Derechos cedidos; alcance', guidance: 'Derechos patrimoniales; extensión geográfica; duración; no exclusividad salvo indicación; derechos morales inalienables.', legalBasis: 'Código de Comercio art. 2612' },
      { id: 'creaciones-futuras', title: 'Creaciones futuras', guidance: 'Cesión automática de creaciones futuras dentro del objeto.' },
      { id: 'garantias', title: 'Garantías', guidance: 'Titularidad; originalidad; no infracción; ausencia de gravámenes; libre uso.' },
      { id: 'remuneracion', title: 'Remuneración', guidance: 'Forma y monto de compensación; derechos morales no computan como remuneración.' },
      { id: 'ley-aplicable', title: 'Ley aplicable; jurisdicción; arbitraje', guidance: 'Ley colombiana; arbitramento.', legalBasis: 'Ley 1563 de 2012' },
      { id: 'disposiciones-generales', title: 'Disposiciones generales', guidance: 'Acuerdo integral; modificaciones; supervivencia.' },
    ],
  },

  // ----------------------------------------------------------------------
  // 3. Operación y Protección
  // ----------------------------------------------------------------------
  {
    id: 'politica-tratamiento-datos',
    name: 'Política de Tratamiento de Datos Personales (Habeas Data - Ley 1581 de 2012)',
    category: 'Operación y Protección',
    description:
      'Política de tratamiento de datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.',
    legalBasis: [
      'Ley 1581 de 2012 (Habeas Data)',
      'Decreto 1377 de 2013 (reglamenta Ley 1581)',
      'Decreto 1074 de 2015 (Decreto Único Reglamentario)',
      'Ley 1266 de 2008 (información financiera/crediticia)',
      'Ley 527 de 1999 (comercio electrónico)',
    ],
    sections: [
      { id: 'responsable', title: 'Responsable del tratamiento', guidance: 'Identificar responsable; datos de contacto; oficina de atención.', legalBasis: 'Ley 1581 art. 3' },
      { id: 'objeto-alcance', title: 'Objeto y alcance', guidance: 'Finalidad de la política; ámbito de aplicación.' },
      { id: 'principios', title: 'Principios del tratamiento', guidance: 'Principios de legalidad, finalidad, libertad, veracidad, transparencia, acceso y circulación restringida, seguridad y confidencialidad.', legalBasis: 'Ley 1581 arts. 4 y 5' },
      { id: 'datos-recolectados', title: 'Datos personales recolectados; datos sensibles', guidance: 'Datos ordinarios y sensibles (art. 5); menores de edad.', legalBasis: 'Ley 1581 art. 5' },
      { id: 'finalidades', title: 'Finalidades del tratamiento', guidance: 'Finalidades específicas, explícitas y lícitas.', legalBasis: 'Ley 1581 art. 4' },
      { id: 'bases-legales', title: 'Bases legales (causales de licitud)', guidance: 'Causales del art. 9: consentimiento, contrato, obligación legal, interés vital, misión pública, interés legítimo.', legalBasis: 'Ley 1581 art. 9' },
      { id: 'derechos-titular', title: 'Derechos del titular', guidance: 'Conocer, actualizar, rectificar, suprimir, revocar autorización, acceso gratuito; canal y plazos.', legalBasis: 'Ley 1581 art. 8; Decreto 1377 art. 15' },
      { id: 'autorizacion', title: 'Autorización del titular; revocación', guidance: 'Manera de obtener autorización previa, expresa e informada; revocación.', legalBasis: 'Ley 1581 art. 9; Decreto 1377' },
      { id: 'deberes', title: 'Deberes del responsable', guidance: 'Garantizar calidad, seguridad, confidencialidad, acceso; informar; evitar transferencias no autorizadas.', legalBasis: 'Ley 1581 art. 10' },
      { id: 'encargados', title: 'Encargados del tratamiento; terceros', guidance: 'Encargados; contratos; transferencias nacionales/internacionales.', legalBasis: 'Ley 1581 art. 26' },
      { id: 'conservacion', title: 'Conservación, seguridad y supresión', guidance: 'Retención; medidas técnicas/organizativas; supresión.', legalBasis: 'Ley 1581 art. 10; Decreto 1377' },
      { id: 'reclamos', title: 'Quejas y reclamos ante la SIC', guidance: 'Reclamo ante el responsable (15 días) y queja ante la Superintendencia de Industria y Comercio.', legalBasis: 'Ley 1581 arts. 14-15' },
      { id: 'vigencia', title: 'Vigencia; actualizaciones', guidance: 'Vigencia; canales de publicación; actualización.' },
      { id: 'contacto', title: 'Canal de contacto', guidance: 'Datos de contacto para ejercer derechos.' },
    ],
  },
  {
    id: 'terminos-condiciones-plataforma',
    name: 'Términos y Condiciones de Plataforma Digital',
    category: 'Operación y Protección',
    description:
      'Términos y condiciones de uso de una plataforma digital/SaaS conforme a la legislación colombiana de consumo y comercio electrónico.',
    legalBasis: [
      'Estatuto del Consumidor, Ley 1480 de 2011',
      'Ley 527 de 1999 (comercio electrónico; contratación electrónica; firma electrónica)',
      'Código de Comercio; Código Civil',
      'Ley 1581 de 2012 (datos personales)',
      'Ley 1266 de 2008 (información crediticia)',
      'Ley 1437 de 2011 (procedimiento administrativo; SIC)',
    ],
    sections: [
      { id: 'aceptacion', title: 'Aceptación de los términos', guidance: 'Aceptación; capacidad; mayoría de edad.', legalBasis: 'Ley 1480 art. 5; Ley 527 art. 5' },
      { id: 'definiciones', title: 'Definiciones', guidance: 'Definir Usuario, Plataforma, Cuenta, Servicio, Contenido, etc.' },
      { id: 'objeto', title: 'Objeto; alcance del servicio', guidance: 'Qué se ofrece; qué no incluye.' },
      { id: 'registro-cuenta', title: 'Registro; cuenta; credenciales', guidance: 'Creación de cuenta; veracidad; seguridad; responsabilidad.' },
      { id: 'uso-permitido', title: 'Uso permitido; conductas prohibidas', guidance: 'Buen uso; lista de prohibiciones.' },
      { id: 'propiedad-intelectual', title: 'Propiedad intelectual; licencia', guidance: 'PI del titular; licencia limitada al usuario; contenido del usuario.', legalBasis: 'Ley 23 de 1982; Decreto 2685 de 1999' },
      { id: 'contratacion-electronica', title: 'Contratación electrónica; consentimiento informado', guidance: 'Contratos por medios electrónicos; consentimiento; firma electrónica.', legalBasis: 'Ley 527 art. 5' },
      { id: 'pagos', title: 'Pagos; precios; facturación; reembolsos', guidance: 'Precios; impuestos; facturación electrónica; reembolsos; Ley 1480.', legalBasis: 'Ley 1480; Ley 527' },
      { id: 'disponibilidad', title: 'Disponibilidad; mantenimiento; suspensión', guidance: 'SLA; mantenimiento; suspensión temporal.' },
      { id: 'responsabilidad', title: 'Limitación de responsabilidad', guidance: 'Exclusiones y límites sin perjuicio de normas imperativas.', legalBasis: 'Ley 1480' },
      { id: 'indemnidad', title: 'Indemnidad', guidance: 'Indemnidad del usuario por su contenido y uso.' },
      { id: 'suspension-terminacion', title: 'Suspensión y terminación', guidance: 'Causales; efectos; sobrevivencia.' },
      { id: 'datos-personales', title: 'Tratamiento de datos personales', guidance: 'Remitir a la Política de Tratamiento de Datos (Ley 1581).', legalBasis: 'Ley 1581 de 2012' },
      { id: 'ley-aplicable', title: 'Ley aplicable; jurisdicción; arbitraje; SIC', guidance: 'Ley colombiana; jurisdicción; arbitramento; conciliación; SIC.', legalBasis: 'Ley 1563 de 2012; Ley 1437 de 2011' },
      { id: 'vigencia-modificaciones', title: 'Vigencia; modificaciones; notificaciones', guidance: 'Modificaciones; notificación; versión vigente.' },
      { id: 'contacto', title: 'Canal de contacto', guidance: 'Datos de contacto.' },
    ],
  },
  {
    id: 'nda-prestacion-servicios',
    name: 'Acuerdo de Confidencialidad (NDA) y Contrato de Prestación de Servicios',
    category: 'Operación y Protección',
    description:
      'Acuerdo de no divulgación (NDA) combinado con contrato de prestación de servicios (independiente, no laboral).',
    legalBasis: [
      'Código Civil (contratos; incumplimiento; indemnidad)',
      'Código de Comercio',
      'Ley 50 de 1990 art. 29 (prestación de servicios no presunta relación laboral)',
      'Ley 1581 de 2012 (datos personales)',
      'Ley 1563 de 2012 (arbitraje comercial)',
      'Ley 23 de 1982 / Decreto 2685 de 1999 (propiedad intelectual)',
    ],
    sections: [
      { id: 'partes', title: 'Partes', guidance: 'Contratante y prestador; cedente/receptor en el NDA.' },
      { id: 'nda-objeto', title: 'NDA: objeto; información confidencial; exclusiones', guidance: 'Definición de información confidencial; exclusiones (pública, previa, independiente, orden judicial).' },
      { id: 'nda-obligaciones', title: 'NDA: obligaciones de no divulgación y uso restringido', guidance: 'No divulgar; uso restringido; cuidado; necesidad de conocer; salvaguardas.' },
      { id: 'nda-duracion', title: 'NDA: duración; vigencia posterior', guidance: 'Duración; obligación posterior a la prestación.' },
      { id: 'nda-devolucion', title: 'NDA: devolución o destrucción', guidance: 'Devolución/destrucción de información; certificación.' },
      { id: 'objeto-servicios', title: 'Contrato de Prestación de Servicios: objeto; alcance; entregables', guidance: 'Servicios; entregables; hitos; criterios de aceptación.' },
      { id: 'independencia', title: 'Independencia; no relación laboral', guidance: 'Prestador independiente; sin subordinación; no exclusividad salvo indicación.', legalBasis: 'Ley 50 art. 29' },
      { id: 'obligaciones-prestador', title: 'Obligaciones del prestador', guidance: 'Ejecutar con diligencia; calidad; confidencialidad; Ley 1581; salvoconductos.' },
      { id: 'obligaciones-contratante', title: 'Obligaciones del contratante', guidance: 'Suministrar información; pagar; facilitar; accesos.' },
      { id: 'remuneracion', title: 'Remuneración; facturación; pagos; retenciones', guidance: 'Honorarios; forma de pago; factura electrónica; retenciones en la fuente; IVA.' },
      { id: 'plazo-terminacion', title: 'Plazo; terminación; causales; efectos', guidance: 'Vigencia; renovación; terminación; no renovación automática; devolución de materiales.' },
      { id: 'propiedad-intelectual', title: 'Propiedad intelectual', guidance: 'Titularidad de entregables; cesión; PI preexistente; licencias.', legalBasis: 'Ley 23 de 1982; Código de Comercio art. 2610' },
      { id: 'datos-personales', title: 'Tratamiento de datos personales', guidance: 'Rol de encargado; Ley 1581.', legalBasis: 'Ley 1581 de 2012' },
      { id: 'responsabilidad-indemnidad', title: 'Responsabilidad; indemnidad; límite', guidance: 'Responsabilidad; indemnidad; límites sin perjuicio de normas imperativas.' },
      { id: 'ley-aplicable', title: 'Ley aplicable; jurisdicción; arbitraje', guidance: 'Ley colombiana; arbitramento.', legalBasis: 'Ley 1563 de 2012' },
      { id: 'disposiciones-generales', title: 'Disposiciones generales', guidance: 'Acuerdo integral; modificaciones; notificaciones; anexos; orden de prelación.' },
    ],
  },
] as const;
