/* VentureLex AI - Logic Application */
var AppState = {
  currentTab: 'editor',
  currentStep: 1,
  selectedContractType: 'nda',
  aiTokensUsed: 480,
  aiTokensMax: 2000,
  currentVersion: 'v1.0',
  documentStatus: 'Borrador',

  startup: {
    name: 'Krypton Labs S.A.S.',
    taxId: '901.458.921-3',
    jurisdiction: 'Bogotá D.C., Colombia',
    repName: 'Valeria Gómez Andrade',
    repId: 'C.C. 1.020.845.992',
    address: 'Calle 93B # 13-45, Of. 602, Bogotá D.C.'
  },

  counterparty: {
    name: 'Mateo Restrepo Cardona',
    id: 'C.C. 1.018.732.140',
    role: 'Co-Fundador & Chief Technology Officer (CTO)',
    email: 'mateo.restrepo@devcraft.io'
  },

  terms: {
    ndaNature: 'Bilateral (Mutuo)',
    ndaDuration: '3 (tres) años',
    ndaPenalty: 'USD 50,000',
    ndaPurpose: 'Evaluación de posible alianza estratégica tecnológica, desarrollo de software e inversión',

    vestingEquity: '15.00%',
    vestingPeriod: '48 meses (4 años)',
    vestingCliff: '12 meses (1 año)',
    vestingAcceleration: 'Double Trigger (Cambio de Control + Despido Injustificado)',
    vestingLeaver: 'Recompra obligatoria al valor nominal para Bad Leaver; retención de acciones consolidadas para Good Leaver',

    servicesFee: 'USD 4,500 mensuales',
    servicesPaymentTerms: 'Mensual contra factura y entregable aprobado',
    servicesScope: 'Arquitectura de microservicios, desarrollo de frontend en Next.js, endpoints REST/GraphQL, pipelines CI/CD y documentación técnica completa.',
    servicesIp: 'Cesión Total, Exclusiva e Irrevocable a favor de la Startup (Work-for-Hire)',

    noncompete: true,
    nonsolicit: true,

    isStricter: false,
    isPlainLanguage: false,
    hasArbitrationClause: false
  },

  versions: [
    { id: 'v1.0', label: 'v1.0 • Borrador Inicial', timestamp: 'Hoy, 10:30 AM', note: 'Creación automática' }
  ],

  contractsList: [
    {
      id: 'CTR-001',
      title: 'Acuerdo de Confidencialidad y No Divulgación',
      type: 'nda',
      counterparty: 'Mateo Restrepo Cardona',
      version: 'v1.0',
      status: 'Borrador',
      date: '19/11/2026'
    },
    {
      id: 'CTR-002',
      title: 'Contrato de Vesting y Asignación de Equity',
      type: 'vesting',
      counterparty: 'Camila Torres (Head of AI)',
      version: 'v1.2',
      status: 'Finalizado',
      date: '12/11/2026'
    },
    {
      id: 'CTR-003',
      title: 'Prestación de Servicios de Consultoría Cloud',
      type: 'services',
      counterparty: 'CloudOps Latam LLC',
      version: 'v2.0',
      status: 'Finalizado',
      date: '04/11/2026'
    },
    {
      id: 'CTR-004',
      title: 'Acuerdo de Confidencialidad Bilateral',
      type: 'nda',
      counterparty: 'Andes Capital Partners VC',
      version: 'v1.1',
      status: 'Borrador',
      date: '28/10/2026'
    }
  ]
};

function safeCreateIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn('Lucide icons warning:', e);
    }
  }
}

window.goToStep = function(stepNumber) {
  AppState.currentStep = stepNumber;

  document.getElementById('step-content-1').classList.add('hidden');
  document.getElementById('step-content-2').classList.add('hidden');
  document.getElementById('step-content-3').classList.add('hidden');

  var activeEl = document.getElementById('step-content-' + stepNumber);
  activeEl.classList.remove('hidden');
  activeEl.classList.add('fade-enter-active');

  for (var i = 1; i <= 3; i++) {
    var btn = document.getElementById('step-btn-' + i);
    var badge = btn.querySelector('span:first-child');
    if (i === stepNumber) {
      btn.className = "font-medium text-indigo-600 flex items-center space-x-1";
      badge.className = "w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold";
    } else if (i < stepNumber) {
      btn.className = "font-medium text-emerald-600 flex items-center space-x-1";
      badge.className = "w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold";
    } else {
      btn.className = "font-medium text-slate-400 hover:text-slate-600 flex items-center space-x-1";
      badge.className = "w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold";
    }
  }

  var pct = stepNumber === 1 ? '33%' : stepNumber === 2 ? '66%' : '100%';
  document.getElementById('step-progress-bar').style.width = pct;
  document.getElementById('step-percent-text').innerText = 'Paso ' + stepNumber + ' de 3 (' + pct + ')';

  safeCreateIcons();
};

window.switchTab = function(tabName) {
  AppState.currentTab = tabName;
  var viewEditor = document.getElementById('view-editor');
  var viewContracts = document.getElementById('view-contracts');
  var navEditor = document.getElementById('nav-editor');
  var navContracts = document.getElementById('nav-contracts');

  if (tabName === 'editor') {
    viewEditor.classList.remove('hidden');
    viewContracts.classList.add('hidden');
    navEditor.className = "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 transition";
    navContracts.className = "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition";
  } else {
    viewEditor.classList.add('hidden');
    viewContracts.classList.remove('hidden');
    navEditor.className = "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition";
    navContracts.className = "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 transition";
  }
  safeCreateIcons();
};

window.selectContractType = function(type) {
  AppState.selectedContractType = type;

  var types = ['nda', 'vesting', 'services'];
  types.forEach(function(t) {
    var pill = document.getElementById('tab-pill-' + t);
    var card = document.getElementById('type-card-' + t);

    if (t === type) {
      pill.className = "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-white font-medium bg-slate-800 border-l-2 border-indigo-500 transition";
      card.className = "p-2.5 rounded-lg border-2 border-indigo-600 bg-indigo-50/30 cursor-pointer transition relative group";
    } else {
      pill.className = "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-400 hover:bg-slate-800/60 transition";
      card.className = "p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition relative group";
    }
  });

  document.getElementById('conditional-fields-nda').classList.add('hidden');
  document.getElementById('conditional-fields-vesting').classList.add('hidden');
  document.getElementById('conditional-fields-services').classList.add('hidden');
  document.getElementById('conditional-fields-' + type).classList.remove('hidden');

  var badge = document.getElementById('terms-badge-type');
  if (type === 'nda') badge.innerText = "NDA Confidencialidad";
  if (type === 'vesting') badge.innerText = "Vesting Equity Co-founders";
  if (type === 'services') badge.innerText = "Servicios de Software Dev";

  window.renderContract();
  window.showToast('Plantilla cambiada a: ' + type.toUpperCase(), 'info');
  safeCreateIcons();
};

window.updateField = function(key, value) {
  if (key in AppState.startup) {
    AppState.startup[key] = value;
  } else if (key in AppState.counterparty) {
    AppState.counterparty[key] = value;
  } else if (key in AppState.terms) {
    AppState.terms[key] = value;
  }
  window.renderContract(key);
};

window.toggleClauseOption = function(optionName, isChecked) {
  AppState.terms[optionName] = isChecked;
  window.renderContract();
  window.showToast('Cláusula ' + (isChecked ? 'añadida' : 'removida'), 'info');
};

function flashElements(tokenClass) {
  if (!tokenClass) return;
  var elements = document.querySelectorAll('.' + tokenClass);
  elements.forEach(function(el) {
    el.classList.remove('highlight-flash');
    void el.offsetWidth;
    el.classList.add('highlight-flash');
  });
}

window.loadDemoData = function() {
  AppState.startup = {
    name: 'Krypton Labs S.A.S.',
    taxId: '901.458.921-3',
    jurisdiction: 'Bogotá D.C., Colombia',
    repName: 'Valeria Gómez Andrade',
    repId: 'C.C. 1.020.845.992',
    address: 'Calle 93B # 13-45, Of. 602, Bogotá D.C.'
  };

  AppState.counterparty = {
    name: 'Mateo Restrepo Cardona',
    id: 'C.C. 1.018.732.140',
    role: 'Co-Fundador & Chief Technology Officer (CTO)',
    email: 'mateo.restrepo@devcraft.io'
  };

  document.getElementById('input-startup-name').value = AppState.startup.name;
  document.getElementById('input-startup-taxid').value = AppState.startup.taxId;
  document.getElementById('input-startup-jurisdiction').value = AppState.startup.jurisdiction;
  document.getElementById('input-startup-rep').value = AppState.startup.repName;
  document.getElementById('input-startup-rep-id').value = AppState.startup.repId;

  document.getElementById('input-counterparty-name').value = AppState.counterparty.name;
  document.getElementById('input-counterparty-id').value = AppState.counterparty.id;
  document.getElementById('input-counterparty-role').value = AppState.counterparty.role;
  document.getElementById('input-counterparty-email').value = AppState.counterparty.email;

  window.renderContract();
  window.showToast('Datos demo de startup cargados con éxito', 'success');
};

window.renderContract = function(updatedFieldKey) {
  var type = AppState.selectedContractType;
  var s = AppState.startup;
  var c = AppState.counterparty;
  var t = AppState.terms;

  var headerDocTitle = document.getElementById('header-doc-title');
  var docRenderTitle = document.getElementById('doc-render-title');
  var docRenderDate = document.getElementById('doc-render-date');
  var docRenderJurisdiction = document.getElementById('doc-render-jurisdiction');

  document.getElementById('sign-startup-name').innerText = s.name || '[Razón Social Startup]';
  document.getElementById('sign-startup-rep').innerText = s.repName || '[Representante Legal]';
  document.getElementById('sign-startup-id').innerText = (s.repId || '[ID]') + ' / Rep. Legal';

  document.getElementById('sign-counterparty-name').innerText = c.name || '[Nombre Contraparte]';
  document.getElementById('sign-counterparty-role').innerText = c.role || '[Rol / Cargo]';
  document.getElementById('sign-counterparty-id').innerText = c.id || '[Documento ID]';

  docRenderJurisdiction.innerText = 'Jurisdicción: ' + (s.jurisdiction || 'Colombia');

  var bodyHTML = '';

  if (type === 'nda') {
    headerDocTitle.innerText = "Acuerdo de Confidencialidad (NDA)";
    docRenderTitle.innerText = "ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN DE INFORMACIÓN (NDA)";
    
    bodyHTML = '<div class="mb-5 text-justify">' +
      '<p>Entre los suscritos a saber, por una parte, ' +
      '<strong class="token-startupName">' + (s.name || 'KRYPTON LABS S.A.S.') + '</strong>, ' +
      'sociedad constituida con identificación tributaria ' +
      '<span class="font-mono token-startupTaxId">' + (s.taxId || '901.458.921-3') + '</span>, ' +
      'con domicilio principal en <span class="token-startupJurisdiction">' + (s.jurisdiction || 'Bogotá D.C.') + '</span>, ' +
      'representada por <strong class="token-startupRep">' + (s.repName || 'Valeria Gómez Andrade') + '</strong> ' +
      '(en adelante, la <strong>"Parte Divulgante"</strong>); y por la otra parte, ' +
      '<strong class="token-counterpartyName">' + (c.name || 'Mateo Restrepo Cardona') + '</strong>, ' +
      'identificado(a) con documento <span class="font-mono token-counterpartyId">' + (c.id || 'C.C. 1.018.732.140') + '</span>, ' +
      'en su calidad de <span class="token-counterpartyRole">' + (c.role || 'Co-Fundador & CTO') + '</span> ' +
      '(en adelante, la <strong>"Parte Receptora"</strong>), ' +
      'se conviene celebrar el presente Acuerdo de Confidencialidad de naturaleza <strong>' + t.ndaNature + '</strong>, sujeto a lo siguiente:</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">PRIMERA. — OBJETO Y PROPÓSITO PERMITIDO:</h4>' +
      '<p>El propósito del presente Acuerdo es regir la protección de Información Confidencial intercambiada exclusivamente para el fin: ' +
      '<em class="token-ndaPurpose font-semibold text-slate-800">"' + t.ndaPurpose + '"</em>. ' +
      'Queda expresamente prohibido destinar dicha información a cualquier otro propósito sin previa autorización escrita.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">SEGUNDA. — ALCANCE DE LA INFORMACIÓN CONFIDENCIAL:</h4>' +
      '<p>Se entenderá por Información Confidencial toda información técnica, financiera, comercial, estratégica, código fuente, algoritmos, arquitectura de software, bases de datos y modelos de negocio. ' +
      (t.isStricter ? '<span class="text-indigo-900 font-semibold bg-indigo-50/50 p-1 rounded block mt-1">[PROTECCIÓN REFORZADA IA] La obligación abarcará análisis, compilaciones, pronósticos y derivados técnicos.</span>' : '') +
      '</p></div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">TERCERA. — PLAZO Y VIGENCIA DE LA RESERVA:</h4>' +
      '<p>Las obligaciones de confidencialidad asumidas bajo este instrumento tendrán una vigencia de ' +
      '<strong class="token-ndaDuration text-indigo-700">' + t.ndaDuration + '</strong>. ' +
      'Para secretos industriales y código fuente, la reserva persistirá de manera <strong>indefinida</strong> conforme a ley.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">CUARTA. — CLÁUSULA PENAL PECUNIARIA:</h4>' +
      '<p>En caso de divulgación indebida de la Información Confidencial, la Parte Receptora pagará a título de pena la suma de ' +
      '<strong class="token-ndaPenalty font-mono text-indigo-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">' + t.ndaPenalty + '</strong>, ' +
      'sin necesidad de requerimiento judicial previo y sin perjuicio de indemnizaciones mayores comprobadas.</p>' +
      '</div>' +

      ((t.noncompete || t.nonsolicit) ? 
      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">QUINTA. — PROTECCIÓN DE TALENTO Y NO COMPETENCIA:</h4>' +
      '<p>' +
      (t.nonsolicit ? 'Durante la vigencia y por 12 meses posteriores, la Parte Receptora se abstendrá de solicitar o contratar colaboradores clave de la Startup. ' : '') +
      (t.noncompete ? 'Asimismo, se compromete a no participar en el desarrollo directo de soluciones competidoras directas durante 1 año.' : '') +
      '</p></div>' : '') +

      (t.hasArbitrationClause ? 
      '<div class="space-y-1 text-justify bg-indigo-50/40 p-2.5 rounded border border-indigo-100">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-indigo-900">SEXTA. — RESOLUCIÓN DE DISPUTAS Y ARBITRAJE ACELERADO (IA):</h4>' +
      '<p class="text-xs text-indigo-950">Toda discrepancia será sometida a arbitraje acelerado en el Centro de Arbitraje de la Cámara de Comercio de ' + (s.jurisdiction.split(',')[0] || 'la ciudad sede') + ', mediante un árbitro único en derecho.</p>' +
      '</div>' : '');
  } 
  else if (type === 'vesting') {
    headerDocTitle.innerText = "Contrato de Vesting Co-fundadores";
    docRenderTitle.innerText = "CONTRATO DE VESTING Y CONSOLIDACIÓN GRADUAL DE PARTICIPACIÓN ACCIONARIA";

    bodyHTML = '<div class="mb-5 text-justify">' +
      '<p>Comparecen al presente contrato, por una parte, ' +
      '<strong class="token-startupName">' + (s.name || 'KRYPTON LABS S.A.S.') + '</strong> (la <strong>"Compañía"</strong>), con NIT ' +
      '<span class="font-mono token-startupTaxId">' + s.taxId + '</span>, representada por <strong class="token-startupRep">' + s.repName + '</strong>; y por la otra parte, ' +
      '<strong class="token-counterpartyName">' + (c.name || 'Mateo Restrepo Cardona') + '</strong> (el <strong>"Fundador Sujeto a Vesting"</strong>), ' +
      'en su rol de <span class="token-counterpartyRole">' + c.role + '</span>.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">PRIMERA. — ASIGNACIÓN DE EQUITY Y VESTING:</h4>' +
      '<p>La Compañía confiere al Fundador un porcentaje del ' +
      '<strong class="token-vestingEquity font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">' + t.vestingEquity + '</strong> ' +
      'del capital social suscrito. Dicha participación se consolidará de manera condicionada durante ' +
      '<strong class="token-vestingPeriod text-slate-800">' + t.vestingPeriod + '</strong>, sujeta a dedicación continua.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">SEGUNDA. — PERÍODO CLIFF:</h4>' +
      '<p>Se estipula un período de Cliff de <strong class="token-vestingCliff text-slate-900">' + t.vestingCliff + '</strong>. Si el Fundador se retira antes de dicho lapso, no consolidará acción alguna (0%). Cumplido el Cliff, consolidará automáticamente el 25%, y el remanente en cuotas mensuales sucesivas.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">TERCERA. — ACELERACIÓN DE DERECHOS:</h4>' +
      '<p>En caso de cambio de control o adquisición estratégica, aplicará la regla pactada como: ' +
      '<strong class="token-vestingAcceleration font-semibold text-indigo-700">' + t.vestingAcceleration + '</strong>.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">CUARTA. — CONDICIONES DE SEPARACIÓN (GOOD / BAD LEAVER):</h4>' +
      '<p>En caso de desvinculación: <span class="token-vestingLeaver font-medium text-slate-800">' + t.vestingLeaver + '</span>.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">QUINTA. — CESIÓN IRREVOCABLE DE DERECHOS DE SOFTWARE:</h4>' +
      '<p>El Fundador cede a favor de la Compañía todos los derechos patrimoniales sobre código, repositorios, marcas y propiedad intelectual desarrollada durante el proyecto.</p>' +
      '</div>';
  }
  else if (type === 'services') {
    headerDocTitle.innerText = "Contrato de Prestación de Servicios Tech";
    docRenderTitle.innerText = "CONTRATO DE PRESTACIÓN DE SERVICIOS TÉCNICOS Y DESARROLLO DE SOFTWARE INDEPENDIENTE";

    bodyHTML = '<div class="mb-5 text-justify">' +
      '<p>Concurren al otorgamiento del presente instrumento, por una parte, ' +
      '<strong class="token-startupName">' + (s.name || 'KRYPTON LABS S.A.S.') + '</strong> (el <strong>"Contratante"</strong>), con NIT ' +
      '<span class="font-mono token-startupTaxId">' + s.taxId + '</span>, representada por <strong class="token-startupRep">' + s.repName + '</strong>; y por la otra parte, ' +
      '<strong class="token-counterpartyName">' + (c.name || 'Mateo Restrepo Cardona') + '</strong> (el <strong>"Contratista"</strong>), ' +
      'identificado con <span class="font-mono token-counterpartyId">' + c.id + '</span>.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">PRIMERA. — OBJETO CONTRACTUAL Y ENTREGABLES:</h4>' +
      '<p>El Contratista se obliga a desarrollar con total autonomía técnica los siguientes entregables: ' +
      '<em class="token-servicesScope font-medium text-slate-800">"' + t.servicesScope + '"</em>.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">SEGUNDA. — HONORARIOS Y PAGO:</h4>' +
      '<p>Los honorarios ascienden a la suma de ' +
      '<strong class="token-servicesFee font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">' + t.servicesFee + '</strong>, ' +
      'pagaderos bajo la modalidad: <strong class="token-servicesPaymentTerms text-slate-800">' + t.servicesPaymentTerms + '</strong>.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">TERCERA. — CESIÓN TOTAL DE PROPIEDAD INTELECTUAL (IP):</h4>' +
      '<p>Régimen de derechos: <strong class="token-servicesIp text-slate-900">' + t.servicesIp + '</strong>. Toda obra se considera ejecutada por encargo (*work for hire*), cediendo en forma exclusiva al Contratante el 100% de los derechos de explotación y comercialización.</p>' +
      '</div>' +

      '<div class="space-y-1 text-justify">' +
      '<h4 class="font-sans font-bold text-xs uppercase tracking-wider text-slate-800">CUARTA. — INDEPENDENCIA CONTRACTUAL:</h4>' +
      '<p>El presente acuerdo es de índole mercantil y no constituye relación de subordinación laboral alguna.</p>' +
      '</div>';
  }

  document.getElementById('doc-dynamic-content').innerHTML = bodyHTML;

  if (updatedFieldKey) {
    flashElements('token-' + updatedFieldKey);
  }

  safeCreateIcons();
};

window.applyAITweak = function(tweakType) {
  AppState.aiTokensUsed = Math.min(AppState.aiTokensMax, AppState.aiTokensUsed + 45);
  window.updateTokenMeter();

  var contentEl = document.getElementById('doc-dynamic-content');
  var skeletonEl = document.getElementById('doc-skeleton-loader');
  var skeletonMsg = document.getElementById('skeleton-loader-message');

  contentEl.classList.add('hidden');
  skeletonEl.classList.remove('hidden');

  if (tweakType === 'stricter') {
    skeletonMsg.innerText = "Reescribiendo cláusulas con estándar de máxima protección judicial...";
  } else if (tweakType === 'plain') {
    skeletonMsg.innerText = "Transformando arcaísmos jurídicos a lenguaje legal claro...";
  } else if (tweakType === 'dispute') {
    skeletonMsg.innerText = "Integrando cláusula arbitral acelerada...";
  }

  setTimeout(function() {
    if (tweakType === 'stricter') {
      AppState.terms.isStricter = true;
      AppState.terms.ndaPenalty = "USD 100,000";
      document.getElementById('input-nda-penalty').value = "USD 100,000";
      window.addVersion('v1.1 - Cláusulas Estrictas (IA)');
      window.showToast('Cláusulas ajustadas: Nivel de exigencia judicial reforzado', 'success');
    } else if (tweakType === 'plain') {
      AppState.terms.isPlainLanguage = true;
      window.addVersion('v1.2 - Lenguaje Simplificado (IA)');
      window.showToast('Lenguaje simplificado: Términos claros estilo Stripe/Notion', 'success');
    } else if (tweakType === 'dispute') {
      AppState.terms.hasArbitrationClause = true;
      window.addVersion('v1.3 - Cláusula Arbitraje Acelerado (IA)');
      window.showToast('Cláusula de Resolución de Conflictos integrada', 'success');
    }

    skeletonEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
    window.renderContract();

    var banner = document.getElementById('doc-ai-banner');
    var bannerText = document.getElementById('doc-ai-banner-text');
    banner.classList.remove('hidden');
    bannerText.innerText = 'Ajuste IA aplicado: ' + tweakType.toUpperCase() + ' — Optimizado para mitigación de riesgos.';
  }, 750);
};

window.triggerAIGeneration = function() {
  var modal = document.getElementById('modal-ai-progress');
  var progressBar = document.getElementById('modal-ai-progress-bar');
  modal.classList.remove('hidden');
  progressBar.style.width = '0%';

  for (var i = 1; i <= 4; i++) {
    var stepEl = document.getElementById('ai-step-' + i);
    stepEl.className = "flex items-center space-x-3 text-slate-400";
    stepEl.querySelector('span:first-child').className = "w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-bold";
  }

  var steps = [
    { pct: 25, stepId: 'ai-step-1', delay: 400 },
    { pct: 55, stepId: 'ai-step-2', delay: 900 },
    { pct: 85, stepId: 'ai-step-3', delay: 1400 },
    { pct: 100, stepId: 'ai-step-4', delay: 1900 },
  ];

  steps.forEach(function(s) {
    setTimeout(function() {
      progressBar.style.width = s.pct + '%';
      var el = document.getElementById(s.stepId);
      el.className = "flex items-center space-x-3 text-indigo-600 font-medium";
      el.querySelector('span:first-child').className = "w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold";
    }, s.delay);
  });

  setTimeout(function() {
    modal.classList.add('hidden');
    AppState.aiTokensUsed = Math.min(AppState.aiTokensMax, AppState.aiTokensUsed + 60);
    window.updateTokenMeter();
    window.addVersion('v1.0 - Compilado IA Auditado');
    window.renderContract();
    window.showToast('¡Borrador generado y auditado por IA con éxito!', 'success');
  }, 2300);
};

window.addVersion = function(label) {
  var versionNum = (1.0 + (AppState.versions.length * 0.1)).toFixed(1);
  var vId = 'v' + versionNum;
  var entry = {
    id: vId,
    label: vId + ' • ' + label,
    timestamp: 'Ahora',
    note: label
  };
  AppState.versions.push(entry);

  var sel = document.getElementById('version-select');
  var opt = document.createElement('option');
  opt.value = vId;
  opt.innerText = entry.label;
  opt.className = "bg-slate-900 text-slate-200";
  sel.appendChild(opt);
  sel.value = vId;

  document.getElementById('header-status-badge').innerHTML = '<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-indigo-400"></span>' + vId + ' (IA)';
};

window.switchVersion = function(vId) {
  AppState.currentVersion = vId;
  window.showToast('Historial cambiado a versión ' + vId, 'info');
  window.renderContract();
};

window.updateTokenMeter = function() {
  var pct = Math.round((AppState.aiTokensUsed / AppState.aiTokensMax) * 100);
  document.getElementById('token-progress-bar').style.width = pct + '%';
  document.getElementById('token-counter-text').innerText = AppState.aiTokensUsed + ' / ' + AppState.aiTokensMax;
};

window.exportToPDF = function() {
  var btn = document.getElementById('btn-export-pdf');
  var originalHTML = btn.innerHTML;
  btn.innerHTML = '<span class="text-xs">Exportando...</span>';

  var element = document.getElementById('printable-contract');
  var opt = {
    margin: [10, 10, 10, 10],
    filename: 'Contrato_' + AppState.selectedContractType.toUpperCase() + '_' + AppState.startup.name.replace(/\s+/g, '_') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
  };

  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save().then(function() {
      btn.innerHTML = originalHTML;
      safeCreateIcons();
      window.showToast('Documento PDF descargado correctamente', 'success');
    }).catch(function(err) {
      console.error(err);
      window.print();
      btn.innerHTML = originalHTML;
      safeCreateIcons();
    });
  } else {
    window.print();
    btn.innerHTML = originalHTML;
    safeCreateIcons();
  }
};

window.exportToDOCX = function() {
  var element = document.getElementById('printable-contract');
  var cleanHTML = element.cloneNode(true);
  var noPrints = cleanHTML.querySelectorAll('.no-print');
  noPrints.forEach(function(n) { n.remove(); });

  var docTitle = document.getElementById('doc-render-title') ? document.getElementById('doc-render-title').innerText : 'Contrato';

  var docHeader = '<!DOCTYPE html>' +
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<title>' + docTitle + '</title>' +
    '<style>' +
    'body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; }' +
    'h1 { font-size: 14pt; text-align: center; text-transform: uppercase; font-weight: bold; }' +
    '.token-startupName, .token-counterpartyName { font-weight: bold; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    cleanHTML.innerHTML +
    '</body>' +
    '</html>';

  var blob = new Blob(['\ufeff', docHeader], {
    type: 'application/msword;charset=utf-8'
  });

  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Contrato_' + AppState.selectedContractType.toUpperCase() + '_' + Date.now() + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  window.showToast('Archivo Word (.doc) generado y descargado', 'success');
};

window.copyContractText = function() {
  var element = document.getElementById('printable-contract');
  var text = element.innerText;
  navigator.clipboard.writeText(text).then(function() {
    window.showToast('Contrato copiado al portapapeles en texto plano', 'success');
  }).catch(function() {
    window.showToast('No se pudo copiar automáticamente', 'error');
  });
};

window.renderContractsTable = function(filterQuery) {
  filterQuery = filterQuery || '';
  var tbody = document.getElementById('contracts-table-body');
  var filtered = AppState.contractsList.filter(function(c) {
    var query = filterQuery.toLowerCase();
    return c.title.toLowerCase().includes(query) || c.counterparty.toLowerCase().includes(query) || c.status.toLowerCase().includes(query);
  });

  document.getElementById('contracts-counter-badge').innerText = AppState.contractsList.length;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No se encontraron contratos coincidentes</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(c) {
    var statusBadge = c.status === 'Finalizado' 
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800"><span class="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-500"></span> Finalizado</span>'
      : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800"><span class="w-1.5 h-1.5 mr-1 rounded-full bg-amber-500"></span> Borrador</span>';

    return '<tr class="hover:bg-slate-50/80 transition">' +
      '<td class="py-3 px-4 font-medium text-slate-900 flex items-center space-x-2">' +
        '<span class="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono text-[10px] font-bold">' + c.type.toUpperCase().substring(0, 3) + '</span>' +
        '<div><div class="font-semibold text-slate-900">' + c.title + '</div><div class="text-[10px] font-mono text-slate-400">' + c.id + '</div></div>' +
      '</td>' +
      '<td class="py-3 px-4 text-slate-700 font-medium">' + c.counterparty + '</td>' +
      '<td class="py-3 px-4 font-mono text-[11px] text-slate-500">' + c.version + '</td>' +
      '<td class="py-3 px-4">' + statusBadge + '</td>' +
      '<td class="py-3 px-4 text-slate-500 font-mono text-[11px]">' + c.date + '</td>' +
      '<td class="py-3 px-4 text-right space-x-2">' +
        '<button onclick="window.loadContractFromRepo(\'' + c.id + '\')" class="text-indigo-600 hover:text-indigo-900 font-medium hover:underline">Abrir</button>' +
        '<button onclick="window.duplicateContract(\'' + c.id + '\')" class="text-slate-500 hover:text-slate-800 font-medium hover:underline">Duplicar</button>' +
      '</td>' +
    '</tr>';
  }).join('');
};

window.filterContractsTable = function(val) {
  window.renderContractsTable(val);
};

window.loadContractFromRepo = function(id) {
  var contract = AppState.contractsList.find(function(c) { return c.id === id; });
  if (contract) {
    window.selectContractType(contract.type);
    AppState.counterparty.name = contract.counterparty;
    document.getElementById('input-counterparty-name').value = contract.counterparty;
    window.switchTab('editor');
    window.showToast('Contrato "' + contract.title + '" cargado en el editor', 'info');
  }
};

window.duplicateContract = function(id) {
  var item = AppState.contractsList.find(function(c) { return c.id === id; });
  if (item) {
    var copy = Object.assign({}, item, {
      id: 'CTR-00' + (AppState.contractsList.length + 1),
      title: item.title + ' (Copia)',
      status: 'Borrador',
      date: 'Hoy'
    });
    AppState.contractsList.unshift(copy);
    window.renderContractsTable();
    window.showToast('Contrato duplicado con éxito', 'success');
  }
};

window.quickSaveDocument = function() {
  window.showToast('Cambios guardados en la bóveda cifrada local', 'success');
};

window.markAsFinalized = function() {
  AppState.documentStatus = 'Finalizado';
  var badge = document.getElementById('header-status-badge');
  badge.className = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  badge.innerHTML = '<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400"></span> Finalizado';
  window.showToast('Estado del documento actualizado a: FINALIZADO', 'success');
};

window.openStartupProfileModal = function() {
  document.getElementById('modal-p-name').value = AppState.startup.name;
  document.getElementById('modal-p-taxid').value = AppState.startup.taxId;
  document.getElementById('modal-p-jurisdiction').value = AppState.startup.jurisdiction;
  document.getElementById('modal-p-rep').value = AppState.startup.repName;
  document.getElementById('modal-p-repid').value = AppState.startup.repId;
  document.getElementById('modal-p-address').value = AppState.startup.address;

  document.getElementById('modal-startup-profile').classList.remove('hidden');
  safeCreateIcons();
};

window.closeStartupProfileModal = function() {
  document.getElementById('modal-startup-profile').classList.add('hidden');
};

window.saveStartupProfileModal = function() {
  AppState.startup.name = document.getElementById('modal-p-name').value;
  AppState.startup.taxId = document.getElementById('modal-p-taxid').value;
  AppState.startup.jurisdiction = document.getElementById('modal-p-jurisdiction').value;
  AppState.startup.repName = document.getElementById('modal-p-rep').value;
  AppState.startup.repId = document.getElementById('modal-p-repid').value;
  AppState.startup.address = document.getElementById('modal-p-address').value;

  document.getElementById('input-startup-name').value = AppState.startup.name;
  document.getElementById('input-startup-taxid').value = AppState.startup.taxId;
  document.getElementById('input-startup-jurisdiction').value = AppState.startup.jurisdiction;
  document.getElementById('input-startup-rep').value = AppState.startup.repName;
  document.getElementById('input-startup-rep-id').value = AppState.startup.repId;

  document.getElementById('sidebar-startup-name').innerText = AppState.startup.name;
  document.getElementById('sidebar-startup-taxid').innerText = 'NIT: ' + AppState.startup.taxId;

  window.closeStartupProfileModal();
  window.renderContract();
  window.showToast('Perfil corporativo guardado y actualizado en todos los instrumentos', 'success');
};

window.showToast = function(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  
  var borderClass = 'border-slate-700 bg-slate-900 text-slate-100';
  var iconName = 'info';

  if (type === 'success') {
    borderClass = 'border-emerald-500/30 bg-slate-900 text-emerald-300';
    iconName = 'check-circle';
  } else if (type === 'error') {
    borderClass = 'border-rose-500/30 bg-slate-900 text-rose-300';
    iconName = 'alert-triangle';
  }

  toast.className = 'pointer-events-auto flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl border ' + borderClass + ' shadow-floating text-xs font-medium animate-in slide-in-from-bottom-3 duration-200';
  toast.innerHTML = '<i data-lucide="' + iconName + '" class="w-4 h-4 shrink-0"></i><span>' + message + '</span>';

  container.appendChild(toast);
  safeCreateIcons();

  setTimeout(function() {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3200);
};

function initVentureLexApp() {
  safeCreateIcons();
  window.renderContract();
  window.renderContractsTable();
  window.updateTokenMeter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVentureLexApp);
} else {
  initVentureLexApp();
}
