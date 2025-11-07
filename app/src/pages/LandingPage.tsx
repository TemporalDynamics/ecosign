import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCopyVariant, getActiveVariant } from "../config/copyVariants";
import { trackPageView, trackCTAClick } from "../lib/analytics";
import { Button, Card } from "../components/ui";
import SEO from "../components/SEO";

export function LandingPage() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState(getCopyVariant());
  const [variantId, setVariantId] = useState(getActiveVariant());
  const [showModal, setShowModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'how' | 'court' | 'goal'>('how');

  useEffect(() => {
    const id = getActiveVariant();
    setVariantId(id);
    setVariant(getCopyVariant());
    trackPageView(id);
  }, []);

  const handleCTAClick = async (ctaLabel: string) => {
    await trackCTAClick(variantId, ctaLabel);
    setShowModal(true);
  };

  const handleGuestFlow = () => {
    setShowModal(false);
    navigate("/guest");
  };

  const handleLoginFlow = () => {
    setShowModal(false);
    navigate("/login");
  };

  return (
    <>
      <SEO
        title={variant.hero.title + " | VerifySign"}
        description={variant.hero.subtitle}
        canonical="https://verifysign.com"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        {/* Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  VerifySign
                </span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Precios
                </a>
                <a href="/contact" className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Contacto
                </a>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="text-sm"
                >
                  Iniciar Sesión
                </Button>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 leading-tight tracking-tight">
              {variant.hero.title}
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed max-w-3xl mx-auto">
              {variant.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => handleCTAClick(variant.hero.primaryCTA)}
                className="px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {variant.hero.primaryCTA}
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById("value-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-10 py-4 text-lg font-semibold"
              >
                {variant.hero.secondaryCTA}
              </Button>
            </div>
          </div>
        </section>

        {/* Legal Disclaimer */}
        <section className="container mx-auto px-4 py-12">
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <div className="p-8">
              <div className="flex items-start gap-4">
                <span className="text-4xl">⚖️</span>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-3">
                    Transparencia ante todo
                  </h3>
                  <p className="text-amber-800 dark:text-amber-200 mb-4 leading-relaxed">
                    VerifySign no reemplaza certificaciones oficiales, notariales ni sellos gubernamentales.
                    Su tecnología genera evidencia técnica y trazabilidad verificable, útil como prueba complementaria en procesos legales.
                    La aceptación final siempre dependerá del juez o perito forense que evalúe el caso.
                  </p>
                  <p className="text-amber-800 dark:text-amber-200 mb-4 leading-relaxed">
                    En Estados Unidos y otros países que reconocen la firma electrónica con timestamp, esta evidencia ya respalda reclamos de autoría, integridad o acceso.
                    Nuestra misión es acelerar ese reconocimiento global, para que la justicia digital sea más accesible, económica y equitativa.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowEducationModal(true)}
                    className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-300"
                  >
                    Quiero entender cómo funciona esto
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Value Section */}
        <section id="value-section" className="container mx-auto px-4 py-20 bg-white dark:bg-neutral-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100 mb-6 text-center">
              {variant.value.headline}
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-12 text-center max-w-3xl mx-auto">
              {variant.value.description}
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {variant.value.features.map((feature, index) => (
                <Card
                  key={index}
                  className="p-8 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl flex-shrink-0">{feature.icon}</span>
                    <p className="text-neutral-700 dark:text-neutral-300 text-lg leading-relaxed">
                      {feature.text}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                variant="primary"
                onClick={() => handleCTAClick(variant.value.cta)}
                className="px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {variant.value.cta}
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-neutral-900 dark:bg-black py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 text-center">
                Cómo Funciona
              </h2>
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { icon: "⬆️", title: "Sube tu archivo", desc: "Cualquier tipo: .zip, .pdf, .mp4, .eco" },
                  { icon: "🔗", title: "Genera certificado", desc: "Enlace seguro o certificado de autoría" },
                  { icon: "✅", title: "Sello criptográfico", desc: "Timestamp y firma digital inmutable" },
                  { icon: "📦", title: "Descarga .ECO", desc: "Evidencia portable verificable" }
                ].map((step, idx) => (
                  <Card key={idx} className="bg-neutral-800 border-neutral-700 p-6 text-center hover:bg-neutral-750 transition-colors">
                    <div className="text-5xl mb-4">{step.icon}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-neutral-400">{step.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100 mb-12 text-center">
              Para Quién es VerifySign
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: "💡", title: "Creadores", desc: "Prueba de autoría y prioridad de ideas" },
                { icon: "🏢", title: "Empresas", desc: "Acuerdos y propiedad intelectual" },
                { icon: "⚖️", title: "Legal", desc: "Registro forense previo a certificaciones" },
                { icon: "⚙️", title: "Developers", desc: "Integración de timestamping verificable" }
              ].map((use, idx) => (
                <Card key={idx} className="p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="text-5xl mb-4">{use.icon}</div>
                  <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">{use.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">{use.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="bg-neutral-900 dark:bg-black py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
                Tecnología de Confianza .ECO
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: "⛓️",
                    title: "Anclaje Criptográfico",
                    desc: "Hash único sellado en Blockchain pública. Prueba inmutable de fecha y hora."
                  },
                  {
                    icon: "🛡️",
                    title: "No-Repudiación",
                    desc: "Registro de identidad y compromiso. Nadie puede negar haber accedido o firmado."
                  },
                  {
                    icon: "🔍",
                    title: "Trazabilidad Forense",
                    desc: "Manifiesto verificable de cada acceso, firma y actualización (.ECOX Ready)."
                  }
                ].map((tech, idx) => (
                  <Card key={idx} className="bg-neutral-800 border-neutral-700 p-8 hover:bg-neutral-750 transition-colors">
                    <div className="text-5xl mb-4">{tech.icon}</div>
                    <h3 className="text-2xl font-semibold text-blue-400 mb-3">{tech.title}</h3>
                    <p className="text-neutral-300 leading-relaxed">{tech.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Purpose Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">
              Por una Justicia Digital Abierta
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed">
              VerifySign nació para devolverle al ciudadano el poder de demostrar la verdad con sus propios medios.
              Cada prueba digital firmada, cada timestamp, es un paso hacia un sistema más justo y accesible.
              Menos burocracia, más transparencia.
            </p>
            <Button
              variant="primary"
              onClick={() => handleCTAClick("Unirme a la Revolución")}
              className="px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Unirme a la Revolución de la Confianza Digital
            </Button>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-blue-600 to-cyan-600 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Empieza Hoy Mismo
              </h2>
              <p className="text-xl text-blue-100 mb-10">
                Protege tus documentos más valiosos. Crea evidencia forense verificable en minutos.
              </p>
              <Button
                variant="outline"
                onClick={() => handleCTAClick("Probar VerifySign Gratis")}
                className="bg-white text-blue-600 hover:bg-blue-50 border-0 px-10 py-4 text-lg font-semibold shadow-lg"
              >
                Probar VerifySign Gratis
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-neutral-900 text-neutral-400 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              <p className="mb-4">
                © 2025 <span className="text-blue-400 font-semibold">VerifySign</span> por Temporal Dynamics LLC.
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <a href="/privacy" className="hover:text-white transition-colors">Privacidad</a>
                <a href="/terms" className="hover:text-white transition-colors">Términos</a>
                <a href="/contact" className="hover:text-white transition-colors">Contacto</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Access Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  Elige cómo continuar
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
                Puedes probar VerifySign sin cuenta o crear una cuenta para guardar tus certificados.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <Card
                  className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
                  onClick={handleGuestFlow}
                >
                  <div className="text-5xl mb-4">🚀</div>
                  <h4 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Modo Invitado
                  </h4>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    Prueba rápida sin registro. Perfecto para una primera vez.
                  </p>
                  <ul className="text-sm text-neutral-500 dark:text-neutral-500 space-y-1">
                    <li>✓ Sin registro</li>
                    <li>✓ Certificado inmediato</li>
                    <li>✓ Descargas disponibles</li>
                  </ul>
                </Card>

                <Card
                  className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
                  onClick={handleLoginFlow}
                >
                  <div className="text-5xl mb-4">👤</div>
                  <h4 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Cuenta Completa
                  </h4>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    Guarda y gestiona todos tus certificados en un solo lugar.
                  </p>
                  <ul className="text-sm text-neutral-500 dark:text-neutral-500 space-y-1">
                    <li>✓ Dashboard completo</li>
                    <li>✓ Historial de certificados</li>
                    <li>✓ Gestión de NDAs</li>
                  </ul>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Education Modal */}
      {showEducationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-3xl w-full my-8">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  Entendiendo la Confianza Digital
                </h3>
                <button
                  onClick={() => setShowEducationModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="flex gap-4 mb-6 border-b border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setActiveTab('how')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'how'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Cómo funciona hoy
                </button>
                <button
                  onClick={() => setActiveTab('court')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'court'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Qué pasa si vas a juicio
                </button>
                <button
                  onClick={() => setActiveTab('goal')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'goal'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Nuestro objetivo
                </button>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                {activeTab === 'how' && (
                  <div>
                    <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      Tu evidencia .ECO se basa en hash + timestamp + firma. Eso la hace verificable, aunque no sea certificada por el Estado.
                      Es tecnología abierta que cualquiera puede validar sin depender de nosotros.
                    </p>
                  </div>
                )}
                {activeTab === 'court' && (
                  <div>
                    <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      Puede presentarse como prueba técnica. Un juez o perito puede validar su integridad, aunque la ley aún no lo reconozca como firma oficial.
                      En países como EE.UU., el timestamp criptográfico ya tiene reconocimiento legal en muchos casos.
                    </p>
                  </div>
                )}
                {activeTab === 'goal' && (
                  <div>
                    <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                      Buscamos que gobiernos y cortes adopten el estándar .ECO como prueba válida. No para reemplazar la ley, sino para democratizar el acceso a la verdad.
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400 italic">
                      No ocultamos nada. Te mostramos cómo es, cómo funciona, y qué falta por cambiar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default LandingPage;
