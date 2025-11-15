import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor,
  Building2,
  CheckCircle,
  Code,
  Download,
  Lightbulb,
  Link as LinkIcon,
  Scale,
  ScrollText,
  Shield,
  Upload
} from 'lucide-react';
import CardWithImage from '../components/CardWithImage';
import Tooltip from '../components/Tooltip';

const navDropdowns = [
  {
    label: 'Producto',
    items: [
      { label: 'Cómo funciona', href: '#how-it-works' },
      { label: 'Formato .ECO', href: '#eco-format' },
      { label: 'VerifyTracker (NDA)', href: '#verifytracker' },
      { label: 'Tecnología', href: '#features' }
    ]
  },
  {
    label: 'Casos de Uso',
    items: [
      { label: 'Creadores & Emprendedores', href: '#case-creators' },
      { label: 'Legal & Compliance', href: '#case-legal' },
      { label: 'Científicos & Laboratorios', href: '#case-science' },
      { label: 'Desarrolladores & Makers', href: '#case-devs' }
    ]
  },
  {
    label: 'Aprender',
    items: [
      { label: '¿Qué es el anclaje blockchain?', href: '#glossary' },
      { label: '¿Qué es la no-repudiación?', href: '#glossary' },
      { label: 'Glosario técnico', href: '#glossary' },
      { label: 'Historias reales', href: '#' }
    ]
  }
];

const problemCards = [
  {
    title: 'Creadores',
    description:
      'Compartís tu música, diseño o código y al día siguiente alguien lo presenta como suyo. Tu prueba es un chat, un WhatsApp o un email que cualquiera puede alterar.'
  },
  {
    title: 'Legal & Compliance',
    description:
      'El cliente afirma que el PDF fue alterado y solo tenés un historial alojado en un servidor privado. No podés auditarlo ni compartirlo con el juez.'
  },
  {
    title: 'Científicos & Laboratorios',
    description:
      'Publicás un hallazgo y meses después terminan cuestionando si manipulaste los datos crudos. ¿Cómo probás que no fue así?'
  },
  {
    title: 'Desarrolladores & Makers',
    description:
      'Desplegás un release crítico y aparece un bug catastrófico. ¿Cómo demostrás qué código exactamente estaba en producción?'
  }
];

const solutionCards = [
  {
    title: 'Anclaje Criptográfico',
    description: 'Hash SHA-256 + timestamp + blockchain. Una huella única e inmutable que cualquiera puede verificar.',
    icon: Anchor,
    link: '#glossary'
  },
  {
    title: 'Registro de No-Repudiación',
    description:
      'Identidad, dispositivo y firma digital. VerifyTracker exige NDA y cada evento queda grabado en el .ECOX.',
    icon: Shield,
    link: '#verifytracker'
  },
  {
    title: 'Trazabilidad Forense (.ECO)',
    description: 'Registra versiones, firmas y accesos. Diseñado para auditorías, propiedad intelectual y cadenas de custodia.',
    icon: ScrollText,
    link: '#glossary'
  }
];

const processSteps = [
  {
    title: '1. Subís tu documento',
    description: 'PDF, imagen, video o código. Calculamos su huella digital sin almacenarlo.',
    icon: Upload
  },
  {
    title: '2. Decidís cómo compartirlo',
    description: 'VerifyTracker genera un link NDA único para cada receptor.',
    icon: LinkIcon
  },
  {
    title: '3. Sellamos la evidencia',
    description: 'Firma Ed25519 + timestamp RFC 3161 + OpenTimestamps en blockchain pública.',
    icon: CheckCircle
  },
  {
    title: '4. Recibís tu .ECO',
    description: 'El certificado guarda hash, fecha e historia completa. Cualquiera puede verificarlo.',
    icon: Download
  }
];

const useCases = [
  {
    title: 'Creadores & Emprendedores',
    description:
      'Registrá ideas, código, diseños y demos. Cada versión queda sellada en un .ECO que demuestra prioridad temporal ante cualquier disputa.',
    image: '/assets/users/creadores-y-emprendedores.png',
    icon: Lightbulb,
    badge: 'Ver historias de creadores →',
    badgeColor: 'text-cyan-600',
    anchorId: 'case-creators',
    imagePosition: 'right'
  },
  {
    title: 'Legal & Compliance',
    description:
      'Prepará evidencia antes del juicio. Registra contratos y comunicaciones con trazabilidad verificable. Menos fricción en auditorías.',
    image: '/assets/users/legal-and-compliance.png',
    icon: Scale,
    badge: 'Leer más para abogados →',
    badgeColor: 'text-sky-500',
    anchorId: 'case-legal',
    imagePosition: 'left'
  },
  {
    title: 'Científicos & Laboratorios',
    description:
      'Gestioná propiedad intelectual compartida con un registro inmutable. Ideal para colaboraciones que necesitan confiar sin ceder control.',
    image: '/assets/users/empresas-y-laboratorios.png',
    icon: Building2,
    badge: 'Casos científicos →',
    badgeColor: 'text-indigo-500',
    anchorId: 'case-science',
    imagePosition: 'right'
  },
  {
    title: 'Desarrolladores & Makers',
    description:
      '.ECO se vuelve parte de tu CI/CD. Certificá releases críticos, commits y documentación técnica con nuestra API pública.',
    image: '/assets/users/desarrolladores-y-makers.png',
    icon: Code,
    badge: 'Integrar en mi pipeline →',
    badgeColor: 'text-purple-500',
    anchorId: 'case-devs',
    imagePosition: 'left'
  }
];

const learningCards = [
  {
    title: '¿Qué es el Anclaje Blockchain?',
    description:
      'El hash se ancla en Bitcoin y Polygon sin subir tu archivo. Queda inmune ante cualquier cambio y cualquiera puede verificarlo con el original.'
  },
  {
    title: '¿Qué es SHA-256?',
    description: 'Función matemática que genera una huella digital única de 256 bits. Si cambia un solo bit, el hash cambia por completo.'
  },
  {
    title: '¿Qué es un Timestamp Criptográfico?',
    description:
      'Marca temporal certificada (RFC 3161) que prueba la existencia del documento en una fecha exacta y no se puede modificar.'
  },
  {
    title: '¿Qué es la No-Repudiación?',
    description:
      'Registramos quién, cuándo, desde dónde y qué acción realizó: acceder, firmar, descargar. El .ECOX guarda cada evento.'
  }
];

const differenceCards = [
  {
    title: 'Soberanía de la prueba',
    description: 'Tu .ECO es tuyo. Lo guardás donde quieras y sigue válido aunque VerifySign desaparezca.'
  },
  {
    title: 'Verificación independiente',
    description: 'Cualquiera puede verificar sin crear cuenta ni pagar. Se contrasta localmente contra blockchain pública.'
  },
  {
    title: 'Privacidad por diseño',
    description: 'El .ECO no contiene el documento. Solo la huella. Sin el original nadie puede reconstruir tu contenido.'
  }
];

const planCards = [
  {
    title: 'Comunidad (Gratis)',
    price: '$0/mes',
    perks: ['5 certificaciones mensuales', 'Firma Ed25519', 'Hash SHA-256', 'Verificación pública ilimitada', '1GB de almacenamiento'],
    cta: 'Comenzar Gratis'
  },
  {
    title: 'Creador (Recomendado)',
    price: '$9.99/mes',
    perks: ['Certificaciones ilimitadas', 'Timestamp RFC 3161', 'Anclaje blockchain', 'VerifyTracker', 'Soporte prioritario'],
    cta: 'Probar 14 días gratis'
  },
  {
    title: 'Enterprise',
    price: 'Contacto',
    perks: ['API de alto volumen', 'Licencia eco-packer', 'SSO', 'Cumplimiento HIPAA/SOC 2/ISO', 'Consultoría técnica'],
    cta: 'Contactar Ventas'
  }
];

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white text-gray-900">
      <nav className="bg-white/95 backdrop-blur-sm fixed w-full top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              {navDropdowns.map(dropdown => (
                <div key={dropdown.label} className="group relative">
                  <button className="text-gray-600 hover:text-cyan-600 font-medium transition duration-200">
                    {dropdown.label} ▾
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-3xl bg-white border border-gray-200 shadow-lg opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-200">
                    {dropdown.items.map(item => (
                      <a key={item.label} href={item.href} className="block px-4 py-3 text-sm text-gray-700 hover:text-cyan-600 border-b last:border-0 border-gray-100">
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              <Link to="/verify" className="text-gray-600 hover:text-cyan-600 font-medium transition duration-200">Verificar</Link>
              <Link to="/login" className="text-gray-600 hover:text-cyan-600 font-medium transition duration-200">Iniciar Sesión</Link>
              <Link
                to="/login"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-6 py-2.5 rounded-full transition duration-300 shadow-md hover:shadow-lg"
              >
                Comenzar Gratis
              </Link>
            </div>
            <button
              className="md:hidden text-gray-600 hover:text-cyan-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <a href="#how-it-works" className="block text-gray-600 hover:text-cyan-600 px-3 py-2 rounded-lg">Cómo Funciona</a>
              <a href="#features" className="block text-gray-600 hover:text-cyan-600 px-3 py-2 rounded-lg">Tecnología</a>
              <Link to="/pricing" className="block text-gray-600 hover:text-cyan-600 px-3 py-2 rounded-lg">Precios</Link>
              <Link to="/verify" className="block text-gray-600 hover:text-cyan-600 px-3 py-2 rounded-lg">Verificar</Link>
              <Link to="/login" className="block text-gray-600 hover:text-cyan-600 px-3 py-2 rounded-lg">Iniciar Sesión</Link>
              <Link
                to="/login"
                className="block bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-4 py-2 rounded-full text-center"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      <header id="eco-format" className="pt-32 pb-24 md:pt-40 md:pb-32 bg-gradient-to-br from-cyan-50 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -top-16 right-10 w-60 h-60 bg-gradient-to-br from-cyan-300 to-transparent rounded-full blur-[140px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-blue-300 to-transparent rounded-full blur-[160px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-block px-4 py-2 bg-white/90 backdrop-blur rounded-full text-xs font-semibold text-cyan-700 mb-6 border border-cyan-200">
            Formato .ECO — Huella criptográfica portátil
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-6">
            Tu Trabajo Merece una Prueba que Nadie Pueda Cuestionar.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-6 leading-relaxed">
            VerifySign convierte tus documentos en evidencia forense verificable sin exponer su contenido. Combinamos <Tooltip term="hash SHA-256" definition="Huella digital de 256 bits que detecta cualquier cambio mínimo." /> + <Tooltip term="timestamp criptográfico" definition="Marca de tiempo RFC 3161 que respalda una fecha exacta." /> + <Tooltip term="anclaje blockchain" definition="Registramos el hash en Bitcoin o Polygon para lograr prueba inmutable." /> para entregar una prueba que cualquiera puede verificar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-3">
            <Link
              to="/login"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-10 rounded-full shadow-2xl transition duration-300 transform hover:-translate-y-0.5"
            >
              Certificar mi Primer Documento
            </Link>
            <Link
              to="/verify"
              className="bg-white border-2 border-gray-300 text-gray-700 hover:border-cyan-600 hover:text-cyan-600 font-bold py-4 px-10 rounded-full shadow-lg transition duration-300"
            >
              Ver cómo se Verifica
            </Link>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            💡 VerifySign no reemplaza certificaciones oficiales ni sellos notariales. Genera evidencia técnica verificable que complementa procesos legales. La validez depende del marco legal de cada jurisdicción. <span className="text-cyan-600 font-semibold hover:underline cursor-pointer">Leer más sobre validez legal</span>
          </p>
          <div className="mt-12 bg-white/90 backdrop-blur-xl rounded-[30px] shadow-2xl border border-gray-200 px-8 py-6 text-left text-gray-700">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-1">Verifica con solo el archivo original</p>
            <p className="text-lg font-semibold text-gray-900">
              El archivo .ECO guarda hash SHA-256, timestamp y anclaje blockchain. No revela el contenido, pero te permite reconstruir la verdad byte a byte al verificarlo.
            </p>
          </div>
        </div>
      </header>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-2">El sistema actual no está diseñado para protegerte</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Te piden confiar en quién te está fallando</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {problemCards.map((card, index) => {
              const Icon = [Lightbulb, Scale, Building2, Code][index];
              return (
                <div key={card.title} className="p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 mb-4 text-cyan-600">
                    <Icon className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{card.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center text-gray-700 space-y-2">
            <p>Las herramientas actuales te piden confiar en ellas.</p>
            <p className="font-semibold text-gray-900">VerifySign no te pide confianza. Te da la prueba.</p>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-gradient-to-br from-cyan-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-2">La solución</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">No vendemos firmas. Vendemos verdad.</h2>
            <p className="text-lg text-gray-600 mt-4">
              VerifySign crea evidencia portátil y verificable sin exponer tu contenido. Cada documento certificado se convierte en un .ECO que cualquiera puede validar con el archivo original.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {solutionCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="p-6 rounded-3xl bg-white shadow-xl border border-gray-100 transition duration-300 hover:border-cyan-200">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white mb-4">
                    <Icon className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{card.description}</p>
                  <a href={card.link} className="text-cyan-600 text-sm font-semibold hover:underline">
                    Explorar →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-2">Proceso simple</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Protegé tu trabajo en 4 pasos</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {processSteps.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="p-6 rounded-3xl text-center bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-100 shadow-lg">
                  <div className="inline-flex mx-auto mb-4 items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                    <Icon className="w-8 h-8" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-2">Para quién</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Diseñado para quienes construyen, crean y protegen</h2>
          </div>
          <div className="space-y-12">
            {useCases.map(useCase => (
              <section id={useCase.anchorId} key={useCase.title}>
                <CardWithImage
                  title={useCase.title}
                  description={useCase.description}
                  image={useCase.image}
                  imagePosition={useCase.imagePosition}
                  icon={useCase.icon}
                >
                  <div className="mt-4 text-sm text-gray-600">
                    <a href={`#${useCase.anchorId}`} className={`font-semibold ${useCase.badgeColor} hover:underline`}>
                      {useCase.badge}
                    </a>
                  </div>
                </CardWithImage>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section id="verifytracker" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-2">VerifyTracker</p>
            <h2 className="text-3xl font-bold text-gray-900">Acceso controlado + NDA integrado</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 text-gray-600 text-sm">
              <p>Demostramos no solo que el documento existía, sino a quién y bajo qué condiciones lo mostraste.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Enlace único por receptor con campos obligatorios y NDA previo.</li>
                <li>Registro de identidad, firma, fecha, hora, IP y huella del documento.</li>
                <li>Todo se impregna en el .ECOX reforzando la no-repudiación técnica y contractual.</li>
              </ul>
              <p className="font-semibold text-gray-900">Del "te lo mandé por mail" al "aceptaste verlo bajo NDA".</p>
            </div>
            <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-2xl border border-cyan-700">
              <h3 className="text-xl font-semibold mb-2">Beneficio legal real</h3>
              <p className="leading-relaxed text-sm">
                Si alguien filtra el contenido o niega haberlo recibido, tenés rastro técnico y contractual en blockchain.
              </p>
              <Link to="/nda" className="inline-flex items-center mt-6 px-5 py-3 rounded-full bg-white text-cyan-700 font-semibold shadow-lg hover:shadow-xl transition">
                Crear enlace VerifyTracker
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="glossary" className="py-20 bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400 mb-2">Aprender</p>
            <h2 className="text-3xl md:text-4xl font-bold">Entendé la tecnología detrás de la verdad</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {learningCards.map(card => (
              <div key={card.title} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-2xl">
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-2">Por qué somos diferentes</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">No reemplazamos a nadie. Empoderamos a todos.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {differenceCards.map(card => (
              <div key={card.title} className="p-6 rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition duration-300">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-cyan-600 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.4em]">Planes</p>
            <h2 className="text-3xl md:text-4xl font-bold">Empezá a proteger tu trabajo hoy</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {planCards.map(plan => (
              <div key={plan.title} className="p-6 rounded-3xl bg-white/10 border border-white/20 shadow-lg backdrop-blur">
                <h3 className="text-xl font-semibold mb-2">{plan.title}</h3>
                <p className="text-3xl font-bold mb-4">{plan.price}</p>
                <ul className="text-sm text-white/80 space-y-2 mb-6">
                  {plan.perks.map(perk => (
                    <li key={perk}>✓ {perk}</li>
                  ))}
                </ul>
                <Link
                  to={plan.cta.includes('Contactar') ? '/contact' : '/login'}
                  className="inline-flex justify-center w-full px-4 py-3 rounded-full bg-white text-cyan-700 font-semibold shadow-lg hover:bg-gray-100 transition"
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center space-y-2 text-lg font-semibold">
            <p>Por una Justicia Digital Abierta.</p>
            <p>No vendemos firmas. Vendemos Verdad.</p>
          </div>
        </div>
      </section>

      <footer className="py-16 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300">VerifySign</span>
              <p className="text-sm mt-3">Infraestructura de Confianza Digital — Estándar .ECO</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-white">Cómo funciona</a></li>
                <li><a href="#eco-format" className="hover:text-white">Formato .ECO</a></li>
                <li><a href="#verifytracker" className="hover:text-white">VerifyTracker</a></li>
                <li><a href="#features" className="hover:text-white">Tecnología</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Casos de Uso</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#case-creators" className="hover:text-white">Creadores & Emprendedores</a></li>
                <li><a href="#case-legal" className="hover:text-white">Legal & Compliance</a></li>
                <li><a href="#case-science" className="hover:text-white">Científicos & Laboratorios</a></li>
                <li><a href="#case-devs" className="hover:text-white">Desarrolladores & Makers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Aprender</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#glossary" className="hover:text-white">¿Qué es blockchain?</a></li>
                <li><a href="#glossary" className="hover:text-white">¿Qué es no-repudiación?</a></li>
                <li><a href="#glossary" className="hover:text-white">Glosario técnico</a></li>
                <li><a href="#" className="hover:text-white">Historias reales</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center border-t border-gray-800 pt-8 space-y-3 text-xs">
            <p>© 2025 Temporal Dynamics LLC. El formato .ECO y la arquitectura LTC están protegidos por PPA (US).</p>
            <p>Transparencia total: VerifySign complementa procesos legales. No reemplaza certificaciones oficiales.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
