import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';

// Simple Tooltip Component
const SimpleTooltip = ({ children, text, color = 'gray' }: { children: React.ReactNode; text: string; color?: 'gray' | 'blue' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className={`cursor-help border-b border-dashed ${color === 'blue' ? 'border-[#0E4B8B] text-[#0E4B8B]' : 'border-gray-400 text-gray-700'}`}>
        {children}
      </span>
      {show && (
        <span className={`absolute z-10 w-64 px-3 py-2 text-sm text-white rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2 ${color === 'blue' ? 'bg-[#0E4B8B]' : 'bg-gray-700'}`}>
          {text}
          <span className={`absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent ${color === 'blue' ? 'border-t-[#0E4B8B]' : 'border-t-gray-700'}`}></span>
        </span>
      )}
    </span>
  );
};

// Copy to Clipboard Button Component with Tooltip
const CopyToClipboardButton = () => {
  const [isCopied, setIsCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const fullText = `Cómo Funciona EcoSign - Panorama de firmas y protección

Si necesitás ayuda extra, copiá toda esta página y mostrásela a tu IA de confianza (ChatGPT, Claude, Gemini).

I. El panorama real de las firmas digitales
No todas las firmas sirven para lo mismo. Estas son las más usadas hoy y cómo se diferencian:
- Firma simple: protección baja, muy accesible.
- Firma electrónica avanzada (AES): protección media.
- LegalSign (EcoSign): protección alta y práctica para la mayoría de los acuerdos reales.
- Firma certificada (QES / eIDAS / ESIGN): protección muy alta y regulada.

II. Firmas disponibles en EcoSign

LegalSign (EcoSign)
- La forma más simple y protegida de firmar la mayoría de los acuerdos.
- EcoSign no accede al contenido del archivo.
- La protección queda en manos del usuario y de los firmantes.

Firmas certificadas
- Se usan cuando la ley o el contexto exigen una firma regulada.
- Requieren proveedores certificados y tienen costo adicional.
- EcoSign las integra dentro del flujo cuando es necesario.

III. EcoSign no ve tu documento
EcoSign fue diseñado para que el contenido nunca esté accesible para la plataforma.
El documento se protege antes de llegar a cualquier servidor.
Eso significa que:
- EcoSign no puede leer tu documento.
- El proveedor de nube no puede acceder a su contenido.
- Nadie puede abrirlo sin autorización del usuario.

Para compartir un documento protegido, se necesita un código adicional.
Ese código lo generás vos y solo vos decidís con quién compartirlo.

IV. Protección integrada por defecto
Cada documento firmado queda acompañado por una protección adicional integrada al proceso.
Esto permite demostrar:
- que el documento existía en un momento determinado,
- que no fue modificado,
- y cuándo ocurrió cada acción relevante.

La protección no queda en manos de la plataforma.
Vos te quedás con ella. Cada firmante también.

V. Transparencia Técnica
Si querés profundizar en los detalles del proceso, podés copiar este texto y analizarlo con tu IA de confianza.

Para desarrolladores y usuarios técnicos:
https://github.com/TemporalDynamics/ecosign/blob/main/COMO%20LO%20HACEMOS.md

EcoSign - Protección legal para documentos digitales
ecosign.app

La validez legal depende del contexto y la jurisdicción.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border-2 border-gray-200 hover:bg-white hover:border-black transition-all duration-200 group"
        aria-label="Copiar contenido"
      >
        {isCopied ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <Copy className="w-5 h-5 text-gray-600 group-hover:text-black transition" />
        )}
      </button>
      
      {showTooltip && !isCopied && (
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 w-64 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl">
          ¿Necesitás ayuda? Copiá todo y mostráselo a tu IA de confianza (ChatGPT, Claude, Gemini)
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 -ml-1 border-4 border-transparent border-l-gray-900"></div>
        </div>
      )}
    </div>
  );
};

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header variant="public" />

      {/* Hero */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Firmar es fácil.<br />Estar protegido no siempre.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
            El panorama actual de las firmas digitales es confuso. Esta página te ayuda a entender qué existe y dónde se ubica EcoSign.
          </p>
        </div>
      </header>

      {/* Sticky Copy Button - Fixed Right Side */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden md:block">
        <CopyToClipboardButton />
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 pb-24">

        {/* Panorama de firmas */}
        <section className="mb-24 py-12">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            El panorama real de las firmas digitales
          </h2>
          <p className="text-lg text-gray-700 mb-16 text-center max-w-3xl mx-auto">
            No todas las firmas sirven para lo mismo. Estas son las más usadas hoy y cómo se diferencian.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-[880px] w-full border-collapse text-left">
              <thead>
                <tr className="text-sm">
                  <th className="py-4 px-4 border-b-2 border-gray-300 bg-gray-100 text-gray-600 font-semibold"></th>
                  <th className="py-4 px-4 border-b-2 border-gray-300 bg-gray-100 text-gray-600 font-semibold">Firma simple</th>
                  <th className="py-4 px-4 border-b-2 border-gray-300 bg-gray-100 text-gray-600 font-semibold">
                    <SimpleTooltip 
                      text="Firma electrónica avanzada (AES). Usada por la mayoría de las plataformas comerciales. Nivel medio de protección, generalmente incluida en planes básicos."
                      color="gray"
                    >
                      Firma electrónica
                    </SimpleTooltip>
                  </th>
                  <th className="py-4 px-4 border-b-2 border-gray-300 bg-blue-50/50 font-semibold">
                    <SimpleTooltip 
                      text="Firma legal propia de EcoSign. Diseñada para la mayoría de los acuerdos reales. Protección fuerte, privacidad máxima y control del usuario."
                      color="blue"
                    >
                      LegalSign
                    </SimpleTooltip>
                  </th>
                  <th className="py-4 px-4 border-b-2 border-gray-300 bg-blue-50/30 font-semibold">
                    <SimpleTooltip 
                      text="Firmas reguladas bajo normativas oficiales (eIDAS, QES, ESIGN y equivalentes). Requieren proveedores certificados y suelen tener costo adicional."
                      color="blue"
                    >
                      Firma certificada
                    </SimpleTooltip>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm sm:text-base text-gray-700">
                <tr>
                  <td className="py-5 px-4 border-b border-gray-200 font-semibold text-gray-700 bg-gray-100">Nivel de protección</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Bajo</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Medio</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/50">Alto</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/30">Muy alto</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 border-b border-gray-200 font-semibold text-gray-700 bg-gray-100">¿Quién debe probar en un conflicto?</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">El firmante</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Compartido</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/50">
                    <SimpleTooltip 
                      text="Es decir, quien afirma que la firma no es válida."
                      color="blue"
                    >
                      Quien discute la validez
                    </SimpleTooltip>
                  </td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/30">La otra parte</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 border-b border-gray-200 font-semibold text-gray-700 bg-gray-100">Privacidad del documento</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Media</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Baja</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/50">Máxima</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/30">Baja</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 border-b border-gray-200 font-semibold text-gray-700 bg-gray-100">Control de la evidencia</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Plataforma</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Plataforma</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/50">Usuario y firmantes</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/30">Proveedor regulado</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 border-b border-gray-200 font-semibold text-gray-700 bg-gray-100">Costo y fricción</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Muy bajo</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-white">Medio</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/50">Bajo</td>
                  <td className="py-5 px-4 border-b border-gray-200 bg-blue-50/30">Alto</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 font-semibold text-gray-700 bg-gray-100">Casos de uso típicos</td>
                  <td className="py-5 px-4 bg-white">Aceptaciones simples</td>
                  <td className="py-5 px-4 bg-white">Acuerdos habituales</td>
                  <td className="py-5 px-4 bg-blue-50/50">La mayoría de los acuerdos reales</td>
                  <td className="py-5 px-4 bg-blue-50/30">Contratos regulados</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4 max-w-3xl mx-auto">
            Las responsabilidades probatorias pueden variar según la jurisdicción y el marco legal aplicable.
          </p>
        </section>

        {/* Firmas disponibles en EcoSign */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Las firmas disponibles en EcoSign
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-8">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-2xl font-semibold text-[#0E4B8B]">LegalSign</h3>
                <span className="text-xs text-[#0E4B8B] border border-[#0E4B8B] rounded-full px-2 py-0.5">Recomendada</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Firma legal de EcoSign</p>
              <p className="text-lg text-gray-700 mb-4">
                La forma más simple y protegida de firmar la mayoría de los acuerdos reales, en términos de control y evidencia.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Firmás el documento y queda visiblemente firmado.</li>
                <li>• EcoSign no accede al contenido del archivo.</li>
                <li>• Cada acción queda registrada de forma verificable.</li>
                <li>• La protección queda en manos del usuario y de los firmantes.</li>
                <li>• No depende de que EcoSign "responda" ante un conflicto.</li>
              </ul>
              <p className="text-gray-700 mt-4">
                LegalSign está pensada para el 90% de los acuerdos reales: rápida, económica y con protección sólida para todas las partes.
              </p>
              <p className="text-xs text-gray-500 mt-3">
                No es una firma regulada por un organismo gubernamental, pero cumple con los requisitos legales habituales para acuerdos privados.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <h3 className="text-2xl font-semibold text-black mb-1">Firmas certificadas</h3>
              <p className="text-sm text-gray-600 mb-4">(QES / eIDAS / ESIGN y equivalentes)</p>
              <p className="text-lg text-gray-700 mb-4">
                Cuando la ley o el contexto exigen una firma regulada.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Cumplen con normativas oficiales según jurisdicción.</li>
                <li>• Requieren proveedores de firma certificados.</li>
                <li>• El proveedor de la firma accede al documento.</li>
                <li>• Tienen un costo adicional por cada firma.</li>
                <li>• Se integran dentro del flujo de EcoSign.</li>
              </ul>
              <p className="text-gray-700 mt-4">
                EcoSign integra firmas certificadas para que no tengas que salir del sistema cuando un contrato lo exige.
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Incluso al usar firmas certificadas, EcoSign no accede al contenido del documento.
              </p>
            </div>
          </div>
        </section>

        {/* EcoSign no ve tu documento */}
        <section className="mb-24 py-12">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 text-center">
            Tu archivo nunca se expone.
          </h2>
          <p className="text-xl text-gray-700 mb-12 text-center max-w-3xl mx-auto">
            EcoSign no ve tu documento. Y eso no es una promesa: es una decisión de diseño.
          </p>
          
          <div className="grid md:grid-cols-3 gap-12 mb-12 text-center max-w-4xl mx-auto">
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#0E4B8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700">EcoSign no puede leerlo</p>
            </div>
            
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#0E4B8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                  <line x1="5" y1="5" x2="19" y2="19" strokeWidth="2"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700">La nube no puede acceder</p>
            </div>
            
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#0E4B8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">Solo vos decidís</p>
            </div>
          </div>
          
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            <p>
              Por diseño, es técnicamente imposible que EcoSign acceda al contenido de tu archivo. El documento se cifra íntegramente en el navegador y la plataforma nunca recibe ni puede reconstruir el contenido en claro, garantizando la privacidad incluso frente a terceros o requerimientos externos.
            </p>
            <p>
              Cuando subís un archivo, el documento se protege de forma automática antes de llegar a cualquier servidor. Eso significa que nadie puede abrirlo sin autorización del usuario.
            </p>
            <p>
              Vos firmás el documento normalmente. La diferencia es que el control siempre queda de tu lado.
            </p>
            <p>
              Para compartir un documento protegido, se necesita un código adicional. Ese código lo generás vos y solo vos decidís con quién compartirlo.
            </p>
            <p className="text-sm text-gray-500 text-center mt-6">
              Esto se logra mediante un sistema de cifrado automático controlado por el usuario.
            </p>
          </div>
        </section>

        {/* Protección integrada por defecto */}
        <section className="mb-24 py-12">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 text-center">
            La protección queda con vos.
          </h2>
          <p className="text-xl text-gray-700 mb-12 text-center max-w-3xl mx-auto">
            Integrada por defecto, sin planes extra ni pedidos especiales.
          </p>
          
          <div className="grid md:grid-cols-3 gap-12 mb-12 text-center max-w-4xl mx-auto">
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#0E4B8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">La protección es tuya</p>
              <p className="text-sm text-gray-700">No queda en manos de la plataforma</p>
            </div>
            
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#0E4B8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Cada firmante también la tiene</p>
              <p className="text-sm text-gray-700">No depende de un intermediario</p>
            </div>
            
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-[#0E4B8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Sigue siendo verificable en el tiempo</p>
              <p className="text-sm text-gray-700">Incluso si EcoSign no existiera</p>
            </div>
          </div>
          
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            <p>
              Cada documento firmado en EcoSign queda acompañado por una protección adicional integrada al proceso.
            </p>
            <p>
              Esa protección permite demostrar, de forma clara y verificable:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• que el documento existía en un momento determinado,</li>
              <li>• que no fue modificado,</li>
              <li>• y cuándo ocurrió cada acción relevante.</li>
            </ul>
            <p>
              Esta protección no reemplaza la firma visible del documento. La complementa.
            </p>
            <p>
              La protección no queda en manos de la plataforma. Vos te quedás con ella. Cada firmante también.
            </p>
            <p>
              Eso significa que nadie depende de que EcoSign "responda" en el futuro para demostrar lo ocurrido.
            </p>
            <p className="font-semibold text-gray-900">
              Firmar con EcoSign es firmar sin delegar tu protección.
            </p>
            <p className="text-sm text-gray-500 text-center mt-6">
              La protección se apoya en registros independientes que siguen siendo verificables incluso si EcoSign no existiera.
            </p>
          </div>
        </section>

        {/* Transparencia Técnica (colapsable) */}
        <section className="mb-20">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2 inline-block group-open:mb-6 text-center w-full">
                Transparencia técnica
              </h2>
              <p className="text-sm text-gray-600 mb-4 group-open:hidden text-center">
                Para quienes quieren auditar el proceso →
              </p>
            </summary>
            <div className="space-y-4 text-lg text-gray-700 leading-relaxed mt-4 max-w-3xl mx-auto">
              <p>
                Si querés profundizar en los detalles del proceso de huella digital, registro inalterable o auditoría, podés <strong>copiar este texto</strong> y analizarlo con tu IA de confianza (ChatGPT, Claude, Gemini).
              </p>
              <p>
                Para desarrolladores y usuarios técnicos que deseen verificar nuestros protocolos:
              </p>
              <div className="text-center">
                <a
                  href="https://github.com/TemporalDynamics/ecosign/blob/main/COMO%20LO%20HACEMOS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-base"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Ver documentación técnica en GitHub
                </a>
              </div>
            </div>
          </details>
        </section>

        {/* CTA Final - suave */}
        <section className="text-center pt-16 pb-8">
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Si ya entendiste cómo funciona, podés empezar cuando quieras.
          </p>
          <Link
            to="/login?mode=signup"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar gratis
          </Link>
        </section>

      </main>

      <FooterPublic />
    </div>
  );
}

export default HowItWorksPage;
