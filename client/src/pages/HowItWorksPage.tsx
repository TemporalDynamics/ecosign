import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import InhackeableTooltip from '../components/InhackeableTooltip';
import HuellaDigitalTooltip from '../components/HuellaDigitalTooltip';
import SelloDeIntegridadTooltip from '../components/SelloDeIntegridadTooltip';
import RegistroDigitalInalterableTooltip from '../components/RegistroDigitalInalterableTooltip';
import PolygonTooltip from '../components/PolygonTooltip';
import BitcoinTooltip from '../components/BitcoinTooltip';
import SelloDeTiempoLegalTooltip from '../components/SelloDeTiempoLegalTooltip';

// Copy to Clipboard Button Component
const CopyToClipboardButton = () => {
  const [isCopied, setIsCopied] = useState(false);
  
  const fullText = `Cómo Funciona EcoSign - Verdad Verificable y Privacidad Absoluta

Si necesitás ayuda extra, copiá toda esta página y mostrásela a tu IA de confianza (ChatGPT, Claude, Gemini).

EcoSign no es solo una herramienta de firma. Es una nueva manera de garantizar la autenticidad documental sin sacrificar tu privacidad.

Nuestro sistema se basa en el principio Zero-Knowledge: tu archivo nunca se sube a nuestros servidores. Todo el proceso ocurre en tu dispositivo.

I. Privacidad ante Todo
Cuando cargás un archivo, EcoSign no lo almacena ni lo analiza. Solo calcula su Huella Digital (Sello de Integridad) directamente en tu navegador.
Esa Huella Digital es única, irreversible y suficiente para certificar la integridad del documento.

II. El Proceso en 3 Pasos Simples

1. Huella Digital
• Tu navegador calcula automáticamente el Sello de Integridad del archivo
• La plataforma nunca ve el contenido

2. Firma y Trazabilidad
Según el tipo de firma elegido (Firma Legal o Firma Certificada), el sistema registra:
• Nombre
• Fecha/hora
• Dirección IP
• Evento de firma
Todo queda guardado en un registro de eventos inmutable.

3. Refuerzo de Evidencia (Opcional)
Podés añadir un refuerzo adicional si necesitás fecha cierta legal o mayor solidez probatoria a largo plazo.
Incluye:
• Sello de Integridad local
• Sello de Tiempo Legal (TSA independiente)
• Registro digital inalterable (Polygon y Bitcoin hoy; más redes en el futuro)
Este refuerzo fortalece la evidencia sin modificar la privacidad ni el contenido del documento.

III. Tipos de Firma

Firma Legal (Ilimitada)
- Propósito: Trazabilidad interna
- Características: Hoja de Auditoría, registro completo, privacidad absoluta

Firma Certificada
- Propósito: Contratos externos
- Características: Cumple eIDAS, ESIGN, UETA. Basado en SignNow

Ambas pueden reforzarse con evidencia adicional.

IV. El Certificado .ECO
Cada certificación genera:
• Tu PDF firmado
• Un archivo .ECO con toda la evidencia forense

El .ECO no contiene el documento original. Solo incluye la prueba criptográfica y la cronología de eventos.
Cualquier auditor puede verificar tu .ECO sin depender de la plataforma.

V. Transparencia Técnica
Si querés profundizar en los detalles del proceso de huella digital, registro inalterable o auditoría, podés copiar este texto y analizarlo con tu IA de confianza.

Algunas partes del proyecto serán abiertas para la comunidad de desarrolladores a medida que la plataforma evolucione.

Para desarrolladores y usuarios técnicos:
https://github.com/TemporalDynamics/verifysign/blob/main/COMO%20LO%20HACEMOS

Firma Legal - Certificación digital con privacidad total
ecosign.app`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border-2 border-gray-200 hover:bg-white hover:border-black transition-all duration-200 group"
      title="Copiar todo el contenido de la página"
      aria-label="Copiar contenido"
    >
      {isCopied ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <Copy className="w-5 h-5 text-gray-600 group-hover:text-black transition" />
      )}
    </button>
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
            Cómo funciona EcoSign
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed">
            La evidencia se genera sin acceder a tu documento.
          </p>
          <p className="text-base text-gray-600 max-w-3xl mx-auto leading-relaxed">
            No necesitás entender criptografía para usar EcoSign.<br />
            Esta página explica qué pasa detrás, si querés saber más.
          </p>
        </div>
      </header>

      {/* Sticky Copy Button - Fixed Right Side */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden md:block">
        <CopyToClipboardButton />
      </div>

      {/* Help Text - Visible on scroll */}
      <div className="fixed right-6 top-1/3 transform -translate-y-1/2 z-40 hidden lg:block max-w-xs">
        <p className="text-xs text-gray-500 text-right mb-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
          ¿Necesitás ayuda? Copiá todo y mostráselo a tu IA de confianza →
        </p>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 pb-24">
        
        {/* Privacidad ante Todo */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Privacidad ante Todo
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              Cuando cargás un archivo, EcoSign no lo almacena ni lo analiza. Solo genera una huella matemática única del archivo en tu navegador. El contenido nunca se sube ni se analiza.
            </p>
            <p>
              Esa huella es única, irreversible y suficiente para certificar la integridad del documento.
              <span className="text-sm text-gray-500 block mt-1">A esto lo llamamos <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip> o <SelloDeIntegridadTooltip>Sello de Integridad</SelloDeIntegridadTooltip>.</span>
            </p>
          </div>
        </section>

        {/* El Proceso en 3 Pasos Simples */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8">
            El Proceso en 3 Pasos Simples
          </h2>
          
          <div className="space-y-10">
            {/* Paso 1 */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                <span className="text-gray-400">1.</span> Huella única
              </h3>
              <ul className="space-y-2 text-lg text-gray-700">
                <li>• Tu navegador genera automáticamente una huella única del archivo.</li>
                <li>• La plataforma nunca ve el contenido.</li>
              </ul>
              <p className="text-sm text-gray-500 mt-2">Nombre técnico: <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip> / <SelloDeIntegridadTooltip>Sello de Integridad</SelloDeIntegridadTooltip>.</p>
            </div>

            {/* Paso 2 */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                <span className="text-gray-400">2.</span> Firma y Trazabilidad
              </h3>
              <p className="text-lg text-gray-700 mb-3">
                Según el tipo de firma elegido (Firma Legal o Firma Certificada), el sistema registra:
              </p>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Nombre</li>
                <li>• Fecha/hora</li>
                <li>• Dirección IP</li>
                <li>• Evento de firma</li>
              </ul>
              <p className="text-lg text-gray-700 mt-3">
                Todo queda guardado en un <strong><RegistroDigitalInalterableTooltip>Registro de Eventos Inmutable</RegistroDigitalInalterableTooltip></strong>.
              </p>
              <p className="text-sm text-gray-500 mt-2">Resultado humano: una cronología clara de quién hizo qué y cuándo.</p>
            </div>

            {/* Paso 3 */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                <span className="text-gray-400">3.</span> Refuerzo de evidencia (opcional)
              </h3>
              <p className="text-lg text-gray-700 mb-3">
                Podés añadir un refuerzo adicional si necesitás fecha cierta legal o mayor solidez probatoria a largo plazo.
              </p>
              <p className="text-lg text-gray-700 mb-3">
                Incluye:
              </p>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• <SelloDeIntegridadTooltip>Sello de Integridad</SelloDeIntegridadTooltip> local</li>
                <li>• <SelloDeTiempoLegalTooltip>Sello de Tiempo Legal</SelloDeTiempoLegalTooltip> (TSA independiente)</li>
                <li>• <RegistroDigitalInalterableTooltip>Registro digital inalterable</RegistroDigitalInalterableTooltip> (<PolygonTooltip>Polygon</PolygonTooltip> y <BitcoinTooltip>Bitcoin</BitcoinTooltip> hoy; más redes en el futuro)</li>
              </ul>
              <p className="text-lg text-gray-700 mt-3">
                Este refuerzo fortalece la evidencia sin modificar la privacidad ni el contenido del documento.
              </p>
            </div>
          </div>
        </section>

        {/* Tipos de Firma */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8">
            Tipos de Firma
          </h2>
          <p className="text-lg text-gray-700 mb-4">
            Elegís el tipo de firma según el contexto, no según complejidad.
          </p>
          
          <div className="space-y-10">
            {/* Firma Legal */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                Firma Legal <span className="text-base text-gray-500 font-normal">(Trazabilidad interna)</span>
              </h3>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Hoja de Auditoría completa.</li>
                <li>• Registro de eventos inmutable.</li>
                <li>• Privacidad absoluta (Zero-Knowledge).</li>
                <li>• Firmas ilimitadas incluidas.</li>
              </ul>
            </div>

            {/* Firma Certificada */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                Firma Certificada <span className="text-base text-gray-500 font-normal">(Contratos externos)</span>
              </h3>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Cumple con normativas eIDAS, ESIGN y UETA.</li>
                <li>• Integrado con proveedores de firma legal avanzada.</li>
                <li>• Validez legal para acuerdos con terceros.</li>
              </ul>
            </div>
          </div>

          <p className="text-lg text-gray-700 mt-6 font-semibold">
            Ambas pueden reforzarse con evidencia adicional.
          </p>
        </section>

        {/* El Certificado .ECO */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            El Certificado .ECO
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              Cada certificación genera:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• Tu <strong>PDF firmado</strong></li>
              <li>• Un archivo <strong>.ECO</strong> con toda la evidencia forense</li>
            </ul>
            <p className="mt-4">
              El <strong>.ECO</strong> no contiene el documento original. Solo incluye la prueba criptográfica y la cronología de eventos.
            </p>
            <p>
              Cualquier auditor puede verificar tu .ECO sin depender de la plataforma.
            </p>
          </div>
        </section>

        {/* Transparencia Técnica (colapsable) */}
        <section className="mb-20">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2 inline-block group-open:mb-6">
                Transparencia técnica <span className="text-gray-400 text-2xl ml-2 group-open:hidden">(opcional)</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4 group-open:hidden">
                Para quienes quieren auditar el proceso →
              </p>
            </summary>
            <div className="space-y-4 text-lg text-gray-700 leading-relaxed mt-4">
              <p>
                Si querés profundizar en los detalles del proceso de huella digital, registro inalterable o auditoría, podés <strong>copiar este texto</strong> y analizarlo con tu IA de confianza (ChatGPT, Claude, Gemini).
              </p>
              <p>
                Algunas partes del proyecto serán abiertas para la comunidad de desarrolladores a medida que la plataforma evolucione.
              </p>
              <p>
                Para desarrolladores y usuarios técnicos que deseen verificar nuestros protocolos:
              </p>
              <a
                href="https://github.com/TemporalDynamics/verifysign/blob/main/COMO%20LO%20HACEMOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-base"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Ver Documentación Técnica en GitHub
              </a>
            </div>
          </details>
        </section>

        {/* CTA Final - suave */}
        <section className="text-center pt-16 pb-8">
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Si ya entendiste cómo funciona, podés empezar cuando quieras.
          </p>
          <Link
            to="/login"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar Gratis
          </Link>
        </section>

      </main>

      <FooterPublic />
    </div>
  );
}

export default HowItWorksPage;
