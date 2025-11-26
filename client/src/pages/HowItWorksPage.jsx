import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Clock, Lock, CheckCircle, Hash, Anchor, Copy } from 'lucide-react';
import FooterPublic from '../components/FooterPublic';

// Copy to Clipboard Button Component
const CopyToClipboardButton = () => {
  const [isCopied, setIsCopied] = useState(false);
  
  const fullText = `Cómo Funciona EcoSign - Verdad Verificable y Privacidad Absoluta

Si necesitás ayuda extra, copiá toda esta página y mostrásela a tu IA de confianza (ChatGPT, Claude, Gemini).

EcoSign no es solo una herramienta de firma. Es una nueva manera de garantizar la autenticidad documental sin sacrificar tu privacidad.

Nuestro sistema se basa en el principio Zero-Knowledge: tu archivo nunca se sube a nuestros servidores. Todo el proceso ocurre en tu dispositivo.

I. Privacidad ante Todo
Cuando cargás un archivo, EcoSign no lo almacena ni lo analiza. Solo calcula su huella digital criptográfica (SHA-256) directamente en tu navegador.
Ese hash es único, irreversible y suficiente para certificar la integridad del documento.

II. El Proceso en 3 Pasos Simples

1. Huella Digital (Hash)
• Tu navegador calcula automáticamente el SHA-256 del archivo
• EcoSign nunca ve el contenido

2. Firma y Trazabilidad
Según el tipo de firma elegido (EcoSign o LegalSign), el sistema registra:
• Nombre
• Fecha/hora
• Dirección IP
• Evento de firma
Todo queda guardado en un ChainLog inmutable.

3. Blindaje Forense (Opcional)
Podés activar el Blindaje Forense para añadir:
• Sello de Tiempo Legal (RFC 3161)
• Registro en Blockchain (Polygon)
• (Próximamente) Anclaje en Bitcoin via OpenTimestamps
Este proceso garantiza la fecha cierta legal y la inalterabilidad futura.

III. Tipos de Firma

EcoSign (Ilimitada)
- Propósito: Trazabilidad interna
- Características: Hoja de Auditoría, registro completo, privacidad absoluta

LegalSign
- Propósito: Contratos externos
- Características: Cumple eIDAS, ESIGN, UETA. Basado en SignNow

Ambas pueden blindarse con el Triple Anclaje.

IV. El Certificado .ECO
Cada certificación genera:
• Tu PDF firmado
• Un archivo .ECO con toda la evidencia forense

El .ECO no contiene el documento original. Solo incluye la prueba criptográfica y la cronología de eventos.
Cualquier auditor puede verificar tu .ECO sin depender de EcoSign.

V. Transparencia Técnica
Si querés profundizar en los detalles de hashing, blockchain o auditoría, podés copiar este texto y analizarlo con tu IA de confianza.

Algunas partes del proyecto serán abiertas para la comunidad de desarrolladores a medida que la plataforma evolucione.

Para desarrolladores y usuarios técnicos:
https://github.com/TemporalDynamics/verifysign/blob/main/COMO%20LO%20HACEMOS

EcoSign - Certificación digital con privacidad total
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation - Same as Landing */}
      <nav className="bg-white fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-black font-medium text-[17px] transition duration-200">
                Cómo funciona
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Verificador
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Precios
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
              >
                Comenzar Gratis
              </Link>
            </div>
            <button
              className="md:hidden text-gray-600 hover:text-black"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <Link to="/how-it-works" className="block text-black font-semibold px-3 py-2 rounded-lg">Cómo funciona</Link>
              <Link to="/verify" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Verificador</Link>
              <Link to="/pricing" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Precios</Link>
              <Link to="/login" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Iniciar Sesión</Link>
              <Link
                to="/login"
                className="block bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Cómo Funciona EcoSign
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-6 leading-relaxed">
            Verdad verificable. Privacidad absoluta.
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            EcoSign no es solo una herramienta de firma. Es una nueva manera de garantizar la autenticidad documental sin sacrificar tu privacidad.
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
        
        {/* Subtitle */}
        <div className="mb-16 text-center">
          <p className="text-lg text-gray-700 italic">
            Nuestro sistema se basa en el principio <strong>Zero-Knowledge</strong>: tu archivo nunca se sube a nuestros servidores. Todo el proceso ocurre en tu dispositivo.
          </p>
        </div>

        {/* Privacidad ante Todo */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Privacidad ante Todo
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              Cuando cargás un archivo, EcoSign no lo almacena ni lo analiza. Solo calcula su <strong>huella digital criptográfica (SHA-256)</strong> directamente en tu navegador.
            </p>
            <p>
              Ese hash es único, irreversible y suficiente para certificar la integridad del documento.
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
                <span className="text-gray-400">1.</span> Huella Digital (Hash)
              </h3>
              <ul className="space-y-2 text-lg text-gray-700">
                <li>• Tu navegador calcula automáticamente el SHA-256 del archivo.</li>
                <li>• EcoSign nunca ve el contenido.</li>
              </ul>
            </div>

            {/* Paso 2 */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                <span className="text-gray-400">2.</span> Firma y Trazabilidad
              </h3>
              <p className="text-lg text-gray-700 mb-3">
                Según el tipo de firma elegido (EcoSign o LegalSign), el sistema registra:
              </p>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Nombre</li>
                <li>• Fecha/hora</li>
                <li>• Dirección IP</li>
                <li>• Evento de firma</li>
              </ul>
              <p className="text-lg text-gray-700 mt-3">
                Todo queda guardado en un <strong>ChainLog inmutable</strong>.
              </p>
            </div>

            {/* Paso 3 */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                <span className="text-gray-400">3.</span> Blindaje Forense (Opcional)
              </h3>
              <p className="text-lg text-gray-700 mb-3">
                Podés activar el <strong>Blindaje Forense</strong> para añadir:
              </p>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Sello de Tiempo Legal (RFC 3161)</li>
                <li>• Registro en Blockchain (Polygon)</li>
                <li>• (Próximamente) Anclaje en Bitcoin via OpenTimestamps</li>
              </ul>
              <p className="text-lg text-gray-700 mt-3">
                Este proceso garantiza la <strong>fecha cierta legal</strong> y la inalterabilidad futura.
              </p>
            </div>
          </div>
        </section>

        {/* Tipos de Firma */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8">
            Tipos de Firma
          </h2>
          
          <div className="space-y-10">
            {/* EcoSign */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                EcoSign <span className="text-base text-gray-500 font-normal">(Trazabilidad interna)</span>
              </h3>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Hoja de Auditoría completa.</li>
                <li>• Registro de eventos inmutable.</li>
                <li>• Privacidad absoluta (Zero-Knowledge).</li>
                <li>• Firmas ilimitadas incluidas.</li>
              </ul>
            </div>

            {/* LegalSign */}
            <div>
              <h3 className="text-2xl font-semibold text-black mb-3">
                LegalSign <span className="text-base text-gray-500 font-normal">(Contratos externos)</span>
              </h3>
              <ul className="space-y-2 text-lg text-gray-700 ml-4">
                <li>• Cumple con normativas eIDAS, ESIGN y UETA.</li>
                <li>• Integrado con proveedores de firma legal avanzada.</li>
                <li>• Validez legal para acuerdos con terceros.</li>
              </ul>
            </div>
          </div>

          <p className="text-lg text-gray-700 mt-6 font-semibold">
            Ambas pueden blindarse con el Triple Anclaje.
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
              Cualquier auditor puede verificar tu .ECO sin depender de EcoSign.
            </p>
          </div>
        </section>

        {/* Transparencia Técnica */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Transparencia Técnica
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              Si querés profundizar en los detalles de hashing, blockchain o auditoría, podés <strong>copiar este texto</strong> y analizarlo con tu IA de confianza (ChatGPT, Claude, Gemini).
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
        </section>

        {/* CTA Final */}
        <section className="text-center pt-12">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            ¿Listo para proteger tu trabajo?
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Comenzá gratis hoy mismo. Sin tarjeta de crédito, sin vueltas.
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
