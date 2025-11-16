import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// Tooltip component for technical terms
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <span className="border-b border-dotted border-gray-400 cursor-help">
        {children}
      </span>
      {isVisible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 animate-fade-in">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
        </span>
      )}
    </span>
  );
};

// Benefits slider data
const benefitsSlides = [
  {
    title: 'Mostrá tu trabajo con seguridad',
    description: 'Compartí documentos solo después de que el receptor acepte condiciones. Sabés quién accedió, cuándo y desde dónde.'
  },
  {
    title: 'Firmá en un solo paso',
    description: 'Tu documento. Tu verdad. Tu privacidad. Validez legal en +90 países.'
  },
  {
    title: 'Tu autoría queda protegida para siempre',
    description: 'Cada documento genera un .ECO: tu "aquí y ahora" digital sellado en tiempo real.'
  },
  {
    title: 'Aceptamos todos los formatos',
    description: 'Tu archivo nunca se expone. Nunca se almacena. La versión firmada se genera en el estándar legal internacional.'
  },
  {
    title: 'Privacidad real, sin vueltas',
    description: 'El .ECO guarda la huella, no tu contenido. Como una huella dactilar: identifica sin revelar.'
  },
  {
    title: 'Verificación universal',
    description: 'Cualquiera puede verificar tu evidencia sin cuenta y sin depender de VerifySign.'
  },
  {
    title: 'Tranquilidad total',
    description: 'Sabés que hiciste todo bien y podés demostrarlo.'
  }
];

// Benefits Slider Component
const BenefitsSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % benefitsSlides.length);
      }, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isAutoPlaying]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % benefitsSlides.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + benefitsSlides.length) % benefitsSlides.length);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {benefitsSlides.map((slide, index) => (
            <div key={index} className="w-full flex-shrink-0 px-4">
              <div className="max-w-2xl mx-auto text-center py-12">
                <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
                  {slide.title}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {slide.description}
                </p>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center mt-6 text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  <span>Cómo lo hacemos</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {benefitsSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-cyan-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Fade-in animation on scroll
const FadeInSection = ({ children, className = '', delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Header Component
const Header = () => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const navItems = [
    {
      label: 'Producto',
      items: [
        { label: 'Cómo funciona', href: '#how-it-works' },
        { label: 'Formato .ECO', href: '#eco-format' },
        { label: 'VerifyTracker', href: '#verifytracker' }
      ]
    },
    {
      label: 'Casos de Uso',
      href: '#use-cases'
    },
    {
      label: 'Aprender',
      items: [
        { label: 'Cómo lo hacemos', href: '/how-it-works' },
        { label: 'Glosario técnico', href: '#glossary' }
      ]
    }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-gray-900">
          VerifySign
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <div key={item.label} className="relative">
              {item.items ? (
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  onBlur={() => setTimeout(() => setOpenDropdown(null), 200)}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                  <ChevronDown className="w-4 h-4" />
                </button>
              ) : (
                <a href={item.href} className="text-gray-600 hover:text-gray-900 transition-colors">
                  {item.label}
                </a>
              )}
              {item.items && openDropdown === item.label && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[200px] animate-fade-in">
                  {item.items.map((subItem) => (
                    <a
                      key={subItem.label}
                      href={subItem.href}
                      className="block px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      {subItem.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
            Iniciar Sesión
          </Link>
          <Link
            to="/dashboard"
            className="bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Comenzar Gratis
          </Link>
        </div>
      </div>
    </header>
  );
};

// Main Landing Page
const LandingPageV2 = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInSection>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Tu trabajo merece una verdad que nadie pueda cuestionar.
            </h1>
          </FadeInSection>
          <FadeInSection delay={200}>
            <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              Certificá tus documentos sin exponer tu contenido.
              <br />
              Firmá en un solo paso y obtené evidencia verificable para siempre.
            </p>
          </FadeInSection>
          <FadeInSection delay={400}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="bg-gray-900 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors text-lg"
              >
                Comenzar Gratis
              </Link>
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-gray-900 px-8 py-3 font-medium transition-colors text-lg"
              >
                Cómo funciona
              </a>
            </div>
          </FadeInSection>
          <FadeInSection delay={600}>
            <p className="text-xs text-gray-400 mt-8 max-w-xl mx-auto">
              Llegado el caso, la última palabra es del juez, perito o tribunal.
              <br />
              VerifySign te da el mayor blindaje legal posible en el entorno digital actual.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Mini Block - Verification */}
      <section className="py-16 px-6 bg-gray-50">
        <FadeInSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
              Verificá con solo tu archivo original.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              El archivo .ECO guarda la{' '}
              <Tooltip content="hash + timestamp + blockchain">
                huella criptográfica
              </Tooltip>{' '}
              de tu documento.
              <br />
              No revela nada. Solo confirma si la verdad coincide.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* How It Works - 4 Steps */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
              Protegé tu trabajo en 4 pasos simples.
            </h2>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-12">
            <FadeInSection delay={100}>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 font-semibold mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Elegís tu archivo</h3>
                <p className="text-gray-600 leading-relaxed">
                  Aceptamos todos los formatos. Tu documento nunca se expone ni se almacena.
                </p>
                <p className="text-xs text-gray-400">
                  <Tooltip content="El archivo se procesa localmente, no en nuestros servidores">
                    Ver más
                  </Tooltip>
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 font-semibold mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Firmás en un solo paso</h3>
                <p className="text-gray-600 leading-relaxed">
                  Dibujás tu firma, la colocás donde quieras y queda legalizada.
                </p>
                <p className="text-xs text-gray-400">
                  <Tooltip content="Cumple estándares eIDAS / ESIGN Act - Válido en +90 países">
                    Ver más
                  </Tooltip>
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={300}>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 font-semibold mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Sellás tu evidencia</h3>
                <p className="text-gray-600 leading-relaxed">
                  Elegís cuántas capas querés sumar: timestamp, anclaje, NDA tracking.
                </p>
                <p className="text-xs text-gray-400">
                  <Tooltip content="Verificación técnica independiente">
                    Ver más
                  </Tooltip>
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={400}>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 font-semibold mb-4">
                  4
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Guardás tus dos originales</h3>
                <p className="text-gray-600 leading-relaxed">
                  Tu archivo original y tu versión firmada certifican la misma verdad.
                </p>
                <p className="text-xs text-gray-400">
                  <Tooltip content="Formato .ECO = huella + timestamp, no contenido">
                    Ver más
                  </Tooltip>
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Benefits Slider */}
      <section className="py-32 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              Lo que podés hacer con VerifySign.
            </h2>
          </FadeInSection>
          <FadeInSection delay={200}>
            <BenefitsSlider />
          </FadeInSection>
        </div>
      </section>

      {/* Central Statement */}
      <section className="py-40 px-6">
        <FadeInSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8">
              No vendemos firmas. Vendemos verdad.
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-12">
              Cada documento se convierte en evidencia verificable, privada y portátil.
              <br />
              El formato .ECO asegura que la verdad se mantenga igual, siempre.
            </p>
            <div className="border-t border-gray-200 pt-12 mt-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuestra Misión</h3>
              <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
                Acercar el reconocimiento legal digital a más gente, haciendo que la justicia digital sea accesible, económica y equitativa.
                <br />
                <span className="text-cyan-600 font-medium">Cada timestamp, cada prueba digital firmada, es un paso hacia un sistema más justo.</span>
              </p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-32 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
              Diseñado para quienes crean, protegen y toman decisiones.
            </h2>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-12">
            <FadeInSection delay={100}>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Creadores & Emprendedores
                </h3>
                <p className="text-gray-600">
                  Probá prioridad de ideas, diseños y demos con evidencia sellada.
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Legal & Compliance
                </h3>
                <p className="text-gray-600">
                  Dejá registro claro de contratos, acuerdos y versiones.
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={300}>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Científicos & Laboratorios
                </h3>
                <p className="text-gray-600">
                  Preservá integridad de datos y hallazgos sin revelar contenido.
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={400}>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Desarrolladores & Makers
                </h3>
                <p className="text-gray-600">
                  Certificá releases, commits y documentación técnica.
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Pricing Section with Blue Background */}
      <section className="bg-gradient-to-b from-cyan-600 to-blue-700 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <p className="text-cyan-100 text-sm font-medium mb-2">Por una Justicia Digital Abierta.</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                No vendemos firmas. Vendemos Verdad.
              </h2>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Basic */}
            <FadeInSection delay={100}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-white/80 text-sm font-medium">Comunidad (Gratis)</h3>
                  <p className="text-3xl font-bold text-white mt-2">$0/mes</p>
                </div>
                <ul className="space-y-2 text-sm text-white/80 flex-grow">
                  <li>• 5 certificaciones mensuales</li>
                  <li>• Firma BÁSICA</li>
                  <li>• Hash SHA-256</li>
                  <li>• Timestamp local</li>
                  <li>• 1GB de almacenamiento</li>
                </ul>
                <Link
                  to="/dashboard"
                  className="mt-6 block w-full text-center py-3 bg-white text-cyan-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Comenzar Gratis
                </Link>
              </div>
            </FadeInSection>

            {/* Creator - Recommended */}
            <FadeInSection delay={200}>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 flex flex-col h-full border-2 border-white/30">
                <div className="mb-6">
                  <h3 className="text-white text-sm font-medium">Creador (Recomendado)</h3>
                  <p className="text-3xl font-bold text-white mt-2">$9.99/mes</p>
                </div>
                <ul className="space-y-2 text-sm text-white/90 flex-grow">
                  <li>• 50 certificaciones/mes</li>
                  <li>• Timestamp RFC 3161</li>
                  <li>• Acción de acceso</li>
                  <li>• Soporte prioritario</li>
                  <li>• Exportación IMATRIX.PND</li>
                </ul>
                <Link
                  to="/dashboard"
                  className="mt-6 block w-full text-center py-3 bg-white text-cyan-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Probar 14 días gratis
                </Link>
              </div>
            </FadeInSection>

            {/* Enterprise */}
            <FadeInSection delay={300}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-white/80 text-sm font-medium">Empresas</h3>
                  <p className="text-3xl font-bold text-white mt-2">Contacto</p>
                </div>
                <ul className="space-y-2 text-sm text-white/80 flex-grow">
                  <li>• API de alto volumen</li>
                  <li>• Contrato corporativo</li>
                  <li>• Single sign-on (SSO)</li>
                  <li>• Hosting IMATRIX 2025</li>
                  <li>• Onboarding directo</li>
                </ul>
                <a
                  href="mailto:ventas@verifysign.pro"
                  className="mt-6 block w-full text-center py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors border border-white/30"
                >
                  Contactar Ventas
                </a>
              </div>
            </FadeInSection>

            {/* More info */}
            <FadeInSection delay={400}>
              <div className="flex flex-col justify-center h-full text-white/80 text-sm space-y-4">
                <p>
                  <strong className="text-white">¿Qué es el blockchain?</strong>
                  <br />
                  Es como un notario digital público.
                </p>
                <p>
                  <strong className="text-white">¿Qué es no-repudiación?</strong>
                  <br />
                  Nadie puede negar que firmó.
                </p>
                <p>
                  <strong className="text-white">¿Qué es un timestamp?</strong>
                  <br />
                  Prueba legal de fecha y hora.
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Footer - Dark style */}
      <footer className="bg-gray-900 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <h4 className="text-white font-bold text-lg mb-4">VerifySign</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Infraestructura de Certificación Digital<br />
                Formato .ECO
              </p>
            </div>

            {/* Producto */}
            <div>
              <h5 className="text-white font-semibold mb-4">Producto</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Cómo funciona</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Formato .ECO</a></li>
                <li><a href="#" className="hover:text-white transition-colors">VerifyTracker</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>

            {/* Casos de Uso */}
            <div>
              <h5 className="text-white font-semibold mb-4">Casos de Uso</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Legal & Compliance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Científicos & Laboratorios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Creadores & Makers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Historias reales</a></li>
              </ul>
            </div>

            {/* Aprender */}
            <div>
              <h5 className="text-white font-semibold mb-4">Aprender</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">¿Qué es el blockchain?</a></li>
                <li><a href="#" className="hover:text-white transition-colors">¿Qué es no-repudiación?</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Glosario técnico</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentación</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                Términos de Servicio
              </a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                Política de Privacidad
              </a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                Status
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageV2;
