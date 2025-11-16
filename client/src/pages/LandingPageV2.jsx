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
    description: 'Subí tu archivo y recibís un PDF firmado digitalmente, válido en +90 países.'
  },
  {
    title: 'Tu autoría queda protegida para siempre',
    description: 'Cada documento genera un .ECO: tu "aquí y ahora" digital sellado en tiempo real.'
  },
  {
    title: 'Subí cualquier formato',
    description: 'Nosotros nos encargamos de convertir todo a un PDF claro y legal.'
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
            <p className="text-xs text-gray-400 mt-8">
              VerifySign complementa procesos legales. No reemplaza certificaciones oficiales.
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
      <section id="how-it-works" className="py-24 px-6">
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
                <h3 className="text-xl font-semibold text-gray-900">Subís tu documento</h3>
                <p className="text-gray-600 leading-relaxed">
                  Cualquier formato. Lo convertimos a PDF automáticamente.
                </p>
                <p className="text-xs text-gray-400">
                  <Tooltip content="Conversión sin alterar contenido">
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
                <h3 className="text-xl font-semibold text-gray-900">Firmás con tu firma real</h3>
                <p className="text-gray-600 leading-relaxed">
                  Dibujás tu firma, la colocás donde quieras y queda legalizada.
                </p>
                <p className="text-xs text-gray-400">
                  <Tooltip content="Cumple estándares eIDAS / ESIGN Act">
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
                <h3 className="text-xl font-semibold text-gray-900">Blindás tu evidencia</h3>
                <p className="text-gray-600 leading-relaxed">
                  Elegís cuántas capas de verificación querés y si activar NDA con VerifyTracker.
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
                <h3 className="text-xl font-semibold text-gray-900">Recibís tu PDF firmado + tu .ECO</h3>
                <p className="text-gray-600 leading-relaxed">
                  Tu verdad digital, privada, portable e irrefutable.
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
      <section className="py-24 px-6 bg-gray-50">
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
      <section className="py-32 px-6">
        <FadeInSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              No vendemos firmas. Vendemos verdad.
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Cada documento se convierte en evidencia verificable, privada y portátil.
              <br />
              El formato .ECO asegura que la verdad se mantenga igual, siempre.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-24 px-6 bg-gray-50">
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

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
              Planes simples. Sin sorpresas.
            </h2>
          </FadeInSection>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Basic */}
            <FadeInSection delay={100}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Básico</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">Gratis</p>
                  <p className="text-sm text-gray-500 mt-1">Para probar sin límite de tiempo.</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>10 .ECO/mes</li>
                  <li>1 firma legal</li>
                  <li>1 triple anchoring</li>
                  <li>3 enlaces VerifyTracker</li>
                  <li>1GB almacenamiento</li>
                </ul>
                <Link
                  to="/dashboard"
                  className="block w-full text-center py-3 border border-gray-300 rounded-full text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Comenzar Gratis
                </Link>
              </div>
            </FadeInSection>

            {/* Creator */}
            <FadeInSection delay={200}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Creador</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    $9<span className="text-lg font-normal text-gray-500">/mes*</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Para creadores y freelancers.</p>
                  <p className="text-xs text-gray-400">*$14/mes después del primer mes</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>50 .ECO/mes</li>
                  <li>20 firmas legales</li>
                  <li>15 triple anchoring</li>
                  <li>30 VerifyTracker</li>
                  <li>25GB almacenamiento</li>
                  <li>Sin marcas de agua</li>
                  <li>Soporte prioritario</li>
                </ul>
                <Link
                  to="/dashboard"
                  className="block w-full text-center py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                >
                  Elegir Creador
                </Link>
              </div>
            </FadeInSection>

            {/* Pro */}
            <FadeInSection delay={300}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    $19<span className="text-lg font-normal text-gray-500">/mes</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Para equipos y estudios.</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>Certificaciones ilimitadas</li>
                  <li>30 firmas legales</li>
                  <li>50 triple anchoring</li>
                  <li>100 VerifyTracker</li>
                  <li>50GB almacenamiento</li>
                  <li>API + Webhooks</li>
                  <li>Soporte 24/7</li>
                </ul>
                <Link
                  to="/dashboard"
                  className="block w-full text-center py-3 border border-gray-300 rounded-full text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Elegir Pro
                </Link>
              </div>
            </FadeInSection>

            {/* Enterprise */}
            <FadeInSection delay={400}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Empresarial</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    Desde $99<span className="text-lg font-normal text-gray-500">/mes</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">SSO, volúmenes, SLA, auditorías.</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>Todo de Pro +</li>
                  <li>Single Sign-On</li>
                  <li>SLA garantizado</li>
                  <li>Auditorías de seguridad</li>
                  <li>Onboarding personalizado</li>
                  <li>Account manager dedicado</li>
                </ul>
                <a
                  href="mailto:ventas@verifysign.pro"
                  className="block w-full text-center py-3 border border-gray-300 rounded-full text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Hablar con ventas
                </a>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-gray-500 text-sm">
            © 2025 VerifySign por Temporal Dynamics LLC
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
              Términos
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
              Privacidad
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
              Docs Técnicos
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
              Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageV2;
