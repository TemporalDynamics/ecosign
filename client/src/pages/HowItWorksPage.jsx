import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, FileText, Lock, Cloud, Scale, Eye } from 'lucide-react';

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

const HowItWorksPage = () => {
  const sections = [
    {
      id: 1,
      icon: <FileText className="w-8 h-8" />,
      title: 'Tu archivo nunca pierde su forma',
      landingStep: 'Paso 1: Elegís tu archivo',
      content: (
        <>
          <p className="mb-4">
            Aceptamos cualquier formato.
            <br />
            Vos trabajás como siempre, en Word, Excel, Photoshop, CAD, lo que sea.
            <br />
            No te pedimos "convertir", "subir algo especial" ni "adaptarte al sistema".
          </p>
          <p className="mb-4">
            Nosotros hacemos la conversión técnica a PDF solo para la firma legal,
            porque la ley exige ese formato para que la firma quede sellada.
            <br />
            <strong>Tu archivo original queda intacto</strong>, guardado en tu nube, sin tocarse.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-gray-900 mb-2">En resumen:</p>
            <ul className="space-y-1 text-gray-700">
              <li>• Tu original es tuyo.</li>
              <li>• El PDF firmado es tu respaldo legal.</li>
              <li>• Ambos conviven, ninguno reemplaza al otro.</li>
            </ul>
          </div>
        </>
      )
    },
    {
      id: 2,
      icon: <Lock className="w-8 h-8" />,
      title: 'Tu firma digital legal sin vueltas',
      landingStep: 'Paso 2: Firmás en un solo paso',
      content: (
        <>
          <p className="mb-4">
            Dibujás tu firma o escribís tu nombre.
            <br />
            La colocás donde quieras dentro del documento.
            <br />
            Hacés clic.
            <br />
            <strong>Listo.</strong>
          </p>
          <p className="mb-4">
            La API de SignNow sella tu firma bajo normas <strong>eIDAS / ESIGN</strong>
            <br />
            (aceptadas en más de 90 países).
          </p>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-cyan-900 mb-2">Lo que NO hacemos:</p>
            <ul className="space-y-1 text-cyan-700">
              <li>• No hay pasos confusos.</li>
              <li>• No hay "plantillas".</li>
              <li>• No hay flujos raros de firma en cadena.</li>
            </ul>
            <p className="mt-3 text-cyan-800 font-medium">
              Firmás en un paso, con una firma legal que vale igual que en papel.
            </p>
          </div>
        </>
      )
    },
    {
      id: 3,
      icon: <Shield className="w-8 h-8" />,
      title: 'Blindamos tu evidencia con sellos que nadie puede falsificar',
      landingStep: 'Paso 3: Sellás tu evidencia',
      content: (
        <>
          <p className="mb-4">
            Después de firmar, elegís cuántas capas de verificación querés:
          </p>
          <div className="space-y-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900">Hash SHA-256</p>
              <p className="text-sm text-gray-600">Crea la huella matemática única de tu archivo.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900">Timestamp RFC 3161</p>
              <p className="text-sm text-gray-600">Sella la hora exacta en un servidor auditado.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900">Anclaje en Bitcoin / Polygon</p>
              <p className="text-sm text-gray-600">Deja registro público e inmutable.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900">VerifyTracker (opcional)</p>
              <p className="text-sm text-gray-600">Rastrea quién abrió el documento, sin ver el contenido.</p>
            </div>
          </div>
          <p className="mb-4">
            Vos elegís si querés una, dos o las tres.
            <br />
            Cada capa suma una barrera más contra el fraude.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <p className="text-amber-900 font-medium">
              Esto no es "blockchain mainstream".
              <br />
              <strong>Esto es blindaje forense.</strong>
            </p>
          </div>
        </>
      )
    },
    {
      id: 4,
      icon: <Eye className="w-8 h-8" />,
      title: 'Creamos tu archivo .ECO: tu "verdad digital"',
      landingStep: 'Paso 4: Guardás tus dos archivos',
      content: (
        <>
          <p className="mb-4">
            El .ECO <strong>no guarda tu contenido</strong>.
            <br />
            Guarda solo tus pruebas criptográficas:
            la huella, la hora, los anclajes y la firma del proceso.
          </p>
          <p className="mb-4">
            Hasta acá, genial.
            <br />
            Pero hay un detalle clave:
          </p>
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4 mb-4">
            <p className="font-bold text-emerald-900 text-lg mb-2">🔐 El .ECO está firmado criptográficamente</p>
            <p className="text-emerald-800">
              Eso significa que si alguien abre el .ECO en un editor de texto y cambia un solo carácter,
              la firma matemática se rompe y el verificador lo detecta al instante.
            </p>
          </div>
          <ul className="space-y-2 text-gray-700 mb-4">
            <li>• No se puede "arreglar".</li>
            <li>• No se puede "rehacer".</li>
            <li>• No se puede "re-firmar".</li>
            <li>• <strong>Nadie tiene la clave privada</strong> para falsificar un .ECO válido.</li>
          </ul>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-sm">
            <p className="text-gray-900 font-medium">
              No podés evitar que alguien toque el archivo.
              <br />
              <strong>Sí podés evitar que pase desapercibido.</strong>
              <br />
              Y eso es lo que te protege.
            </p>
          </div>
        </>
      )
    },
    {
      id: 5,
      icon: <Cloud className="w-8 h-8" />,
      title: 'Guardamos tu .ECO original en tu nube (y esto importa mucho)',
      landingStep: 'Almacenamiento seguro en VerifySign',
      content: (
        <>
          <p className="mb-4">
            Puede pasar: alguien modifica tu .ECO.
            <br />
            Y está bien que pueda hacerlo, porque <strong>la manipulación queda expuesta</strong>.
          </p>
          <p className="mb-4">
            Por eso, cada vez que generás un .ECO:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="font-semibold text-blue-900 mb-2">
              Guardamos el archivo original, inalterado, en tu espacio seguro dentro de VerifySign.
            </p>
            <p className="text-blue-800">Así siempre tenés:</p>
            <ul className="mt-2 space-y-1 text-blue-700">
              <li>✓ Tu documento original</li>
              <li>✓ Tu PDF legal firmado</li>
              <li>✓ Tu .ECO original (firma criptográfica intacta)</li>
            </ul>
          </div>
          <p className="mb-4 text-gray-700">
            Aunque pierdas tus archivos, aunque los manipulen, aunque intenten falsificar algo,
            <br />
            <strong>tu panel siempre conserva la versión que importa: la verdadera.</strong>
          </p>
          <div className="bg-gray-900 text-white rounded-lg p-4 text-sm">
            <p className="font-medium">
              Si un .ECO modificado aparece en una disputa,
              <br />
              vos tenés el original con firma válida.
              <br />
              <strong>Y ahí termina la discusión.</strong>
            </p>
          </div>
        </>
      )
    },
    {
      id: 6,
      icon: <Scale className="w-8 h-8" />,
      title: '¿Y si un juez pide ver todo?',
      landingStep: 'Preparado para procesos legales',
      content: (
        <>
          <p className="mb-4 text-xl font-semibold text-emerald-700">
            Estás cubierto.
          </p>
          <p className="mb-4">
            El perito o juez recibe:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Tu archivo original</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Tu PDF firmado legalmente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Tu .ECO original con su firma criptográfica</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Los anclajes públicos (Bitcoin, RFC, Polygon) que podrían verificarse <strong>décadas después</strong></span>
            </li>
          </ul>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900 font-medium">
              No depende de nosotros.
              <br />
              No depende de vos.
              <br />
              <strong>Depende de matemáticas que no se pueden negociar.</strong>
            </p>
          </div>
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver al inicio</span>
          </Link>
          <Link to="/" className="text-xl font-bold text-gray-900">
            VerifySign
          </Link>
          <Link
            to="/dashboard"
            className="bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Comenzar Gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInSection>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
              🧩 Cómo lo hacemos
            </h1>
          </FadeInSection>
          <FadeInSection delay={200}>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Explicado por alguien que quiere que entiendas, no que confíes ciegamente.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Sections */}
      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-16">
          {sections.map((section, index) => (
            <FadeInSection key={section.id} delay={index * 100}>
              <article className="border-l-4 border-cyan-500 pl-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-cyan-600">
                    {section.icon}
                  </div>
                  <span className="text-xs font-medium text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">
                    {section.landingStep}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  {section.id}. {section.title}
                </h2>
                <div className="text-gray-700 leading-relaxed">
                  {section.content}
                </div>
              </article>
            </FadeInSection>
          ))}
        </div>

        {/* Final Section - Why we explain */}
        <FadeInSection delay={700}>
          <div className="mt-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              7. ¿Por qué te explicamos todo esto?
            </h2>
            <p className="text-lg leading-relaxed mb-6 text-gray-300">
              Porque la confianza no se pide.
              <br />
              <strong className="text-white">La confianza se muestra.</strong>
            </p>
            <p className="text-gray-300 mb-6">
              No queremos que uses VerifySign porque suena sofisticado.
              <br />
              Queremos que lo uses porque <strong className="text-white">entendés lo que hace, cómo lo hace y por qué te protege</strong>.
            </p>
            <div className="border-t border-gray-700 pt-6">
              <p className="text-xl font-semibold text-cyan-400">
                No vendemos firmas. Vendemos verdad.
              </p>
              <p className="text-gray-400 mt-2">
                Y la verdad necesita claridad, no magia.
              </p>
            </div>
          </div>
        </FadeInSection>

        {/* CTA */}
        <FadeInSection delay={800}>
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Listo para proteger tu trabajo?
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="bg-gray-900 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors text-lg"
              >
                Comenzar Gratis
              </Link>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-8 py-3 font-medium transition-colors text-lg"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </FadeInSection>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorksPage;
