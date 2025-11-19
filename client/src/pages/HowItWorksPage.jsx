import React, { useState, useEffect, useRef } from 'react';
import { Link, Copy } from 'lucide-react';

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

const CopyToClipboardButton = () => {
  const [isCopied, setIsCopied] = useState(false);
  const fullText = `Cómo Lo Hacemos. Sin tecnicismos innecesarios ni frases de venta vacías.

Si necesitás ayuda extra copiar toda esta página y mostrársela a tu IA de confianza.

( icono semitransparente de copy presente en todo momento de esta pagina debe arrancar en el mismo renglon  que mostrasela a tu ia de confianza pero en el margen derecho cerca del edge y que acompañe al usuario en todo momento a medida que va scroll sube y baja con el scroll)


Así funciona EcoSign, de principio a fin:
Elegí tu archivo: Nunca lo subimos ni lo almacenamos. Tu contenido permanece siempre con vos.
Firmá en un solo paso: Aplicamos una firma digital con validez legal internacional.
Sellá tu evidencia: Sumamos Sello de Tiempo legal, huella digital y anclaje público.
Guardá tu .ECO: Esta es tu evidencia con fecha y hora inmutable.

Eso es todo lo que necesitás para blindar tu trabajo.


1. Tu Archivo Nunca Pierde Su Forma
Aceptamos cualquier formato.
Trabajá como siempre: Word, Excel, Photoshop, CAD, lo que necesites.
Para que la firma sea legal, el estándar exige un formato estático. Por ello, generamos una copia temporal en PDF, solo para aplicar el sello legal.
Tu archivo original queda intacto, sin ser tocado.
El PDF es tu copia legal sellada.
En resumen: Tu contenido no se toca, no se expone y no se almacena en nuestros servidores. Todo queda bajo tu control.

2. Tu Firma Digital Legal, Sin Vueltas
Garantizamos un proceso directo, legal y universal.
Dibujá tu firma o escribí tu nombre, la ubicás donde desees y hacé clic.
Aplicamos el sello de firma bajo normas eIDAS / ESIGN, con validez legal en más de 90 países.
Lo que NO hacemos:
No hay pasos confusos ni plantillas.
No hay rutas complicadas ni firmas "en cadena".
Firmás en un solo paso, con total certeza legal.

🛡️ 3. Blindamos Tu Evidencia con Sellos Irrompibles
Después de firmar, podés elegir cuántas capas de verificación querés sumar:
Capa de Verificación    Descripción    Validez Técnica
Huella Digital (Hash)    La identidad única del contenido.    Probamos la integridad (que nada cambió).
Sello de Tiempo Legal (Timestamp)    Emitido por una TSA bajo el estándar RFC 3161.    Probamos el momento exacto en el que existió el archivo, con validez forense.
Anclaje Público (Blockchain)    Registro descentralizado e inmutable en redes públicas.    Verificable por peritos sin depender de EcoSign.
VerifyTracker (opcional)    Registramos accesos sin ver el contenido.    Probamos la trazabilidad y la no-repudiación.
Cada capa suma una barrera contra el fraude. Esto es blindaje forense total.

📄 4. Creamos Tu Archivo .ECO: Tu Verdad Digital
El .ECO es un certificado ligero que no almacena tu documento. Guardamos solo las pruebas: hash, timestamp, anclaje y la cadena de registros.
Y el detalle clave:
🔐 El .ECO está firmado digitalmente. Si alguien modifica un solo byte, la firma matemática se rompe, el verificador lo detecta y la manipulación queda expuesta al instante.
No se puede "arreglar", "rearmar" ni "copiar". Nadie tiene la clave privada para falsificarlo.
No podemos evitar que alguien intente tocar el archivo, pero sí evitamos que pase desapercibido. Y eso es lo que te protege.

🗂️ 5. La Garantía: Tu .ECO Original
Tu panel de EcoSign siempre conservará la versión que importa:
Tu archivo original
Tu PDF legal firmado
Tu certificado .ECO original
Si perdés tus archivos, si los modifican o si alguien presenta una versión adulterada, tu versión original y la evidencia pública siempre hablan por vos.

⚖️ 6. ¿Si un Juez o Perito Pide Ver Todo?
Estás completamente cubierto. El especialista accede a:
Tu archivo original.
Tu PDF firmado legalmente.
Tu .ECO con firma matemática irrompible.
Los registros públicos verificables con fecha exacta.
La defensa legal no depende de confianza. Depende de matemáticas, estándares abiertos y evidencia pública.

💬 7. ¿Por qué explicamos cada paso?
Porque la confianza no se exige. Se demuestra.
No queremos que confíes porque suene sofisticado. Queremos que entiendas qué hacemos, por qué lo hacemos y cómo te protegemos.
No vendemos firmas. Vendemos certeza.

👉 CÓMO LO HACEMOS — Versión Técnica (GitHub)
https://github.com/TemporalDynamics/verifysign/blob/main/COMO%20LO%20HACEMOS`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 hover:bg-white transition-all duration-200 opacity-70 hover:opacity-100"
      title="Copiar todo el contenido de la página"
    >
      {isCopied ? (
        <CheckIcon className="w-5 h-5 text-green-600" />
      ) : (
        <Copy className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
};

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Volver al inicio</span>
          </Link>
          <Link to="/" className="text-xl font-bold text-gray-900">
            EcoSign
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
              Cómo Lo Hacemos
            </h1>
          </FadeInSection>
          <FadeInSection delay={200}>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Sin tecnicismos innecesarios ni frases de venta vacías.
            </p>
          </FadeInSection>
          <FadeInSection delay={300}>
            <div className="relative">
              <p className="text-md text-gray-500 mt-4 max-w-3xl mx-auto">
                Si necesitás ayuda extra copiar toda esta página y mostrársela a tu IA de confianza.
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Sticky Copy Button */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <CopyToClipboardButton />
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-16">
          {/* Overview Section */}
          <FadeInSection>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                Así funciona EcoSign, de principio a fin
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>• <strong>Elegís tu archivo:</strong> Nunca lo subimos ni lo almacenamos. Tu contenido permanece siempre con vos.</p>
                <p>• <strong>Firmás en un solo paso:</strong> Aplicamos una firma digital con validez legal internacional.</p>
                <p>• <strong>Sellás tu evidencia:</strong> Sumamos Sello de Tiempo legal, huella digital y anclaje público.</p>
                <p>• <strong>Guardás tu .ECO:</strong> Es tu evidencia con fecha y hora inmutable.</p>
                <p className="mt-4 font-semibold">Eso es todo lo que necesitás para blindar tu trabajo.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 1 */}
          <FadeInSection delay={100}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                1. Tu Archivo Nunca Pierde Su Forma
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>• Aceptamos cualquier formato.</p>
                <p>• Trabajás como siempre: Word, Excel, Photoshop, CAD, todo sirve.</p>
                <p className="mt-4">Para que la firma sea legal, el estándar mundial exige un documento estático.</p>
                <p>Por eso generamos una copia temporal en PDF, solo para aplicar el sello legal. Es una copia aislada, automática y descartable.</p>
                <p>• Tu archivo original no se toca, no se altera, no se guarda y no se ve.</p>
                <p>El hash (la huella del archivo) se toma siempre del original, nunca del PDF.</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                  <p className="font-semibold text-gray-900 mb-2">En resumen:</p>
                  <p>Tu contenido queda bajo tu control.</p>
                  <p>La firma legal va sobre el PDF.</p>
                  <p>La prueba forense certifica tu archivo real.</p>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Section 2 */}
          <FadeInSection delay={200}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                2. Tu Firma Digital Legal, Sin Vueltas
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>• Dibujás tu firma o escribís tu nombre.</p>
                <p>• La ubicás donde quieras.</p>
                <p>• Hacés clic.</p>
                <p className="mt-4">El sistema aplica una firma válida bajo normas eIDAS / ESIGN / UETA, aceptada en más de 90 países.</p>
                <p className="mt-4 font-semibold">No hacemos:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Plantillas complicadas</li>
                  <li>Flujos raros</li>
                  <li>Firmas en cadena confusas</li>
                  <li>Configuraciones infinitas</li>
                </ul>
                <p>Firmás en un paso, con validez legal inmediata.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 3 - Single signature section (renumbered as 3) */}
          <FadeInSection delay={250}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                3. Tu Firma Digital Legal, Sin Vueltas
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>• Dibujás tu firma o escribís tu nombre.</p>
                <p>• La ubicás donde quieras.</p>
                <p>• Hacés clic.</p>
                <p className="mt-4">El sistema aplica una firma válida bajo normas eIDAS / ESIGN / UETA, aceptada en más de 90 países.</p>
                <p className="mt-4 font-semibold">No hacemos:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Plantillas complicadas</li>
                  <li>Flujos raros</li>
                  <li>Firmas en cadena confusas</li>
                  <li>Configuraciones infinitas</li>
                </ul>
                <p>Firmás en un paso, con validez legal inmediata.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 4 - Multiple signatures section (new, was requested) */}
          <FadeInSection delay={300}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                4. Múltiples Firmas, En Orden y Sin Fricción
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>¿Necesitás que varias personas firmen el mismo documento?</p>
                <p>También podés hacerlo.</p>
                <p className="mt-4">Cargá los correos en el orden que necesites.</p>
                <p>Una vez firmado, el sistema se ocupa de enviar al siguiente.</p>
                <p className="mt-4">Cada persona recibe:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>su PDF firmado</li>
                  <li>su archivo .ECO</li>
                </ul>
                <p className="mt-4">y la verificación queda registrada</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                  <p className="font-semibold text-gray-900 mb-2">Sin plantillas raras.</p>
                  <p>Sin rutas complicadas.</p>
                  <p>Sin flujos confusos.</p>
                  <p className="mt-2">Solo firmas. En orden. Y bien hechas.</p>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Section 5 - Evidence Protection */}
          <FadeInSection delay={350}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                5. Blindamos Tu Evidencia con Sellos Irrompibles
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-6">
                <p>Después de firmar podés sumar una, dos o todas las capas de verificación:</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Capa</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Qué hace</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Para qué sirve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 font-medium">Huella Digital (Hash)</td>
                        <td className="px-4 py-3">Identidad única del archivo.</td>
                        <td className="px-4 py-3">Demuestra que nada cambió.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Sello de Tiempo Legal (TSA)</td>
                        <td className="px-4 py-3">Fecha y hora exacta emitida por un proveedor oficial bajo RFC 3161.</td>
                        <td className="px-4 py-3">Prueba cuándo existía tu archivo.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Anclaje Público (Blockchain)</td>
                        <td className="px-4 py-3">Registro en redes descentralizadas como Bitcoin o Polygon.</td>
                        <td className="px-4 py-3">Validación pública, independiente de EcoSign.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">VerifyTracker (opcional)</td>
                        <td className="px-4 py-3">Registra accesos sin ver el contenido.</td>
                        <td className="px-4 py-3">Prueba quién lo abrió, cuándo y bajo qué condiciones.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mt-4">Cada capa suma una barrera real contra el fraude.</p>
                <p>Esto es blindaje forense total.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 6 - Document Evolution (new section) */}
          <FadeInSection delay={400}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                6. Documentos Dinámicos: Cambios Sin Perder Evidencia
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>En la vida real, los documentos se negocian, se corrigen y cambian de versión antes de la firma final. Manejamos ese proceso de forma transparente.</p>
                <p>Cuando alguien necesita modificar el documento, no sobrescribimos el archivo anterior ni anulamos las firmas ya aplicadas.</p>
                <p>Generamos una nueva versión del documento (V2, V3, etc.), y cada una mantiene su propia cadena de evidencia:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>PDF legal propio con la firma aplicada</li>
                  <li>.ECO independiente con registro de tiempo exacto</li>
                </ul>
                <p className="mt-4">Las firmas de versiones anteriores quedan intactas como evidencia histórica. Un perito o juez puede ver exactamente qué firmó cada persona en cada momento, sin lugar a confusiones.</p>
                <p className="font-semibold">El documento puede evolucionar, pero la cadena de evidencia permanece clara, completa y verificable.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 7 */}
          <FadeInSection delay={450}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                7. Creamos Tu Archivo .ECO: Tu Verdad Digital
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>El .ECO no contiene tu archivo.</p>
                <p>Guarda solo la evidencia:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>tu hash original,</li>
                  <li>tu sello de tiempo,</li>
                  <li>el anclaje público,</li>
                  <li>y la cadena de registros (si activaste Tracker).</li>
                </ul>

                <p className="mt-4 font-semibold">Lo más importante:</p>

                <p>El .ECO está firmado digitalmente.</p>

                <p>Si alguien cambia un solo byte:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>la firma matemática se rompe,</li>
                  <li>el verificador lo detecta,</li>
                  <li>y la manipulación queda expuesta al instante.</li>
                </ul>

                <p className="mt-4">No se puede arreglar, rearmar ni falsificar.</p>
                <p>Nadie puede generar un .ECO válido sin la clave que lo firma.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 8 */}
          <FadeInSection delay={500}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                8. La Garantía: Tu .ECO Original Siempre Disponible
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>Tu panel de EcoSign siempre mantiene las tres piezas clave:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Tu archivo original (si lo cargaste)</li>
                  <li>Tu PDF legal firmado</li>
                  <li>Tu .ECO original</li>
                </ul>
                <p className="mt-4">Si perdés tus archivos, si los modifican o si alguien presenta una versión alterada, tu evidencia original y los registros públicos siempre te respaldan.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 9 */}
          <FadeInSection delay={600}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                9. ¿Si un Juez o Perito Solicita Todo?
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>Estás completamente respaldado. El experto accede a:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Tu archivo original.</li>
                  <li>Tu PDF firmado legalmente.</li>
                  <li>Tu .ECO con firma matemática irrompible.</li>
                  <li>Los registros públicos verificables con fecha exacta.</li>
                </ul>
                <p className="mt-4">La defensa legal no depende de confianza. Se basa en matemáticas, estándares abiertos y evidencia objetiva.</p>
              </div>
            </div>
          </FadeInSection>

          {/* Section 10 */}
          <FadeInSection delay={700}>
            <div className="border-l-4 border-cyan-500 pl-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                10. ¿Por qué explicamos cada paso?
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>Porque la confianza no se pide. Se demuestra.</p>
                <p>Queremos que entiendas qué hacemos, cómo lo hacemos y por qué te protege.</p>
                <p>No vendemos firmas. Vendemos certeza.</p>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={800}>
            <div className="mt-16 text-center">
              <a
                href="https://github.com/TemporalDynamics/verifysign/blob/main/COMO%20LO%20HACEMOS"
                className="inline-block text-gray-600 hover:text-gray-900 font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                CÓMO LO HACEMOS — Versión Técnica (GitHub)
              </a>
            </div>
          </FadeInSection>

          {/* CTA */}
          <FadeInSection delay={900}>
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¿Listo para proteger tu trabajo?
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/dashboard"
                  className="bg-gray-900 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors text-lg"
                >
                  Probar Gratis
                </Link>
                <Link
                  to="/how-it-works"
                  className="border border-gray-300 text-gray-700 hover:border-cyan-600 hover:text-cyan-600 px-8 py-3 rounded-full font-medium transition-colors text-lg"
                >
                  Ver cómo funciona
                </Link>
              </div>
            </div>
          </FadeInSection>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 EcoSign por Temporal Dynamics LLC. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorksPage;