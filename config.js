// Configuración para validación de dominios confiables
// Agrega aquí los dominios académicos/universitarios que consideres válidos
const TRUSTED_DOMAINS = [
  // Dominios universitarios argentinos
  'uba.ar',
  'frba.utn.edu.ar',
  'itba.edu.ar',
  'ungs.edu.ar',
  'unq.edu.ar',
  'unlam.edu.ar',
  'uned.edu.ar',
  'unsa.edu.ar',
  'unsl.edu.ar',
  'unc.edu.ar',
  'uncu.edu.ar',
  'uncoma.edu.ar',
  'unan.edu.ar',
  'universidadeub.edu.ar',
  'uade.edu.ar',
  'uca.edu.ar',
  'ucema.edu.ar',
  'uces.edu.ar',
  'udesa.edu.ar',
  'universidad.ucsh.edu.ar',
  
  // Otros países
  'edu',
  'ac.uk',
  'edu.ar',
  'edu.us',
  'edu.mx',
  'edu.br',
  'edu.fr',
  'edu.au',
  'edu.cn',
  
  // Dominios de investigación
  'conicet.gov.ar',
  'inta.gob.ar',
  'criba.edu.ar',
  'leloir.org.ar'
];

// Función para validar dominio de email
function isValidEmailDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return TRUSTED_DOMAINS.some(trusted => 
    domain === trusted || domain.endsWith('.' + trusted) || domain.endsWith(trusted)
  );
}

// Exportar para uso en el frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TRUSTED_DOMAINS, isValidEmailDomain };
} else {
  window.TRUSTED_DOMAINS = TRUSTED_DOMAINS;
  window.isValidEmailDomain = isValidEmailDomain;
}