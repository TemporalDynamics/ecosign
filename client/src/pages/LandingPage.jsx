import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* NAVIGATION */}
      <nav className="bg-white/95 backdrop-blur-sm fixed w-full top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Cómo Funciona
              </a>
              <a href="#features" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Características
              </a>
              <Link to="/pricing" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Precios
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Verificar
              </Link>
              <Link
                to="/login"
                className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
              >
                Comenzar Gratis
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-cyan-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <a href="#how-it-works" className="block px-3 py-2 text-gray-600 hover:text-cyan-600 transition duration-200 rounded-lg hover:bg-gray-50">
                Cómo Funciona
              </a>
              <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-cyan-600 transition duration-200 rounded-lg hover:bg-gray-50">
                Características
              </a>
              <Link to="/pricing" className="block px-3 py-2 text-gray-600 hover:text-cyan-600 transition duration-200 rounded-lg hover:bg-gray-50">
                Precios
              </Link>
              <Link to="/verify" className="block px-3 py-2 text-gray-600 hover:text-cyan-600 transition duration-200 rounded-lg hover:bg-gray-50">
                Verificar
              </Link>
              <Link to="/login" className="block px-3 py-2 text-gray-600 hover:text-cyan-600 transition duration-200 rounded-lg hover:bg-gray-50">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="block bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-6 py-2 rounded-lg text-center transition duration-300 mt-2"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-gradient-to-br from-cyan-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold mb-6">
            Certificación Digital Forense
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight text-gray-900">
            La Verdad de tus Documentos,<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Verificable por Cualquiera</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            Crea evidencia forense digital inmutable con hash SHA-256, timestamp criptográfico y anclaje en blockchain. Protege tus documentos con tecnología .ECO.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-10 rounded-lg shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-0.5 text-lg"
            >
              Certificar un Documento
            </Link>
            <Link
              to="/verify"
              className="bg-white border-2 border-gray-300 text-gray-700 hover:border-cyan-600 hover:text-cyan-600 font-bold py-4 px-10 rounded-lg shadow-md hover:shadow-lg transition duration-300 text-lg"
            >
              Verificar Autenticidad
            </Link>
          </div>
        </div>
      </header>

      {/* TRANSPARENCY SECTION */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 md:p-12 rounded-2xl shadow-lg border border-amber-200">
            <div className="flex items-start space-x-6">
              {/* Balanza Icon (⚖️) */}
              <div className="text-5xl flex-shrink-0">⚖️</div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Transparencia ante Todo</h3>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  VerifySign no reemplaza certificaciones oficiales, notariales ni sellos gubernamentales. Su tecnología genera <strong>evidencia técnica y trazabilidad verificable</strong>, útil como prueba complementaria en procesos legales. La aceptación final siempre dependerá del juez o perito forense que evalúe el caso.
                </p>
                <p className="text-gray-700 font-medium leading-relaxed">
                  En Estados Unidos y otros países que reconocen la firma electrónica con <em>timestamp</em>, esta evidencia ya respalda reclamos de autoría, integridad o acceso. Nuestra misión es acelerar ese reconocimiento global, para que la justicia digital sea más accesible, económica y equitativa.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center mt-10">
            <a href="#how-it-works" className="inline-flex items-center text-cyan-600 hover:text-cyan-700 font-semibold transition duration-200 text-lg">
              Quiero entender cómo funciona
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY FEATURES SECTION */}
      <section id="features" className="py-20 md:py-28 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h3 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">Nuestra Tecnología de Confianza</h3>
          <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto mb-16">
            Combinamos criptografía avanzada con blockchain para crear evidencia forense irrefutable
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Certificación .ECO */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">🔒</span>
              </div>
              <h4 className="text-2xl font-bold mb-3 text-gray-900">Certificación .ECO</h4>
              <p className="text-gray-600 leading-relaxed">Genera certificados con hash SHA-256, <em>timestamp</em> y <em>proof</em> criptográfico. Cada documento tiene una huella única e inmutable.</p>
            </div>

            {/* Feature 2: Verificación Independiente */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">🔍</span>
              </div>
              <h4 className="text-2xl font-bold mb-3 text-gray-900">Verificación Independiente</h4>
              <p className="text-gray-600 leading-relaxed">Verifica autenticidad sin depender de la plataforma. Cualquier persona puede validar la integridad de un documento con .ECO.</p>
            </div>

            {/* Feature 3: Firma Digital de NDA */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">📋</span>
              </div>
              <h4 className="text-2xl font-bold mb-3 text-gray-900">Firma Digital de NDA</h4>
              <p className="text-gray-600 leading-relaxed">Flujo completo de acuerdos de confidencialidad con registro de identidad y consentimiento verificable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION (STEPS) */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h3 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">Cómo Funciona</h3>
          <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto mb-16">
            Un proceso simple de 4 pasos para asegurar la verdad de tus documentos
          </p>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📁</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">1. Sube tu Documento</h4>
              <p className="text-gray-600">Admite cualquier tipo: PDF, imágenes, videos, código fuente. Generamos la huella digital única con SHA-256.</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🔗</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">2. Genera Enlace Seguro</h4>
              <p className="text-gray-600">Decide si compartir con un receptor bajo NDA o solo registrar tu autoría. Control total sobre acceso.</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">3. Sella tu Evidencia</h4>
              <p className="text-gray-600">Anclaje criptográfico, registro de no-repudiación, <em>timestamp</em> y firma digital en un solo paso.</p>
            </div>
            {/* Step 4 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📥</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">4. Recibe tu .ECO</h4>
              <p className="text-gray-600">Prueba portable que incluye toda la trazabilidad y los sellos de tiempo verificables.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR (USE CASES) */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h3 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">Para Quién es VerifySign</h3>
          <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto mb-16">
            Diseñado para cualquier persona que necesite proteger sus ideas y documentos
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Use Case 1: Creadores & Emprendedores */}
            <div className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">💡</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Creadores & Emprendedores</h4>
              <p className="text-gray-600">Prueba de autoría y prioridad de ideas, código o diseño.</p>
            </div>
            {/* Use Case 2: Empresas & Laboratorios */}
            <div className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🏢</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Empresas & Laboratorios</h4>
              <p className="text-gray-600">Acuerdos de propiedad intelectual compartida y evidencia de I+D.</p>
            </div>
            {/* Use Case 3: Legal & Compliance */}
            <div className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">⚖️</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Legal & Compliance</h4>
              <p className="text-gray-600">Registro forense previo a certificaciones oficiales y auditorías.</p>
            </div>
            {/* Use Case 4: Desarrolladores & Makers */}
            <div className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">⚙️</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Desarrolladores & Makers</h4>
              <p className="text-gray-600">Integración de <em>timestamping</em> y evidencia verificable en sus flujos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* .ECO DEEP DIVE SECTION */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h3 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">Tecnología de Confianza .ECO</h3>
          <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto mb-16">
            Tres pilares fundamentales que garantizan la integridad de tus documentos
          </p>

          <div className="space-y-8">
            {/* Anclaje Criptográfico */}
            <div className="flex flex-col md:flex-row items-start md:space-x-8 p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 md:mb-0">
                <span className="text-4xl">⛓️</span>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-semibold text-gray-900 mb-3">Anclaje Criptográfico</h4>
                <p className="text-gray-700 leading-relaxed">
                  <em>Hash</em> único de tu archivo, sellado en <strong>Blockchain pública</strong>. Prueba inmutable de fecha y hora, a prueba de litigios, que establece una fecha cierta de creación.
                </p>
              </div>
            </div>

            {/* Registro de No-Repudiación */}
            <div className="flex flex-col md:flex-row items-start md:space-x-8 p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 md:mb-0">
                <span className="text-4xl">🛡️</span>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-semibold text-gray-900 mb-3">Registro de No-Repudiación</h4>
                <p className="text-gray-700 leading-relaxed">
                  Huella del navegador, identidad y compromiso con el documento. Nadie puede negar haber accedido, revisado o firmado el acuerdo.
                </p>
              </div>
            </div>

            {/* Trazabilidad Forense */}
            <div className="flex flex-col md:flex-row items-start md:space-x-8 p-8 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 md:mb-0">
                <span className="text-4xl">📜</span>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-semibold text-gray-900 mb-3">Trazabilidad Forense (.ECOX Ready)</h4>
                <p className="text-gray-700 leading-relaxed">
                  Manifiesto verificable que registra cada acceso, firma y actualización. Diseñado para auditorías, propiedad intelectual y cumplimiento normativo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO AND FINAL CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 text-white">Por una Justicia Digital Abierta</h3>
          <p className="text-xl text-cyan-50 mb-8 leading-relaxed">
            VerifySign nació para devolverle al ciudadano el poder de demostrar la verdad con sus propios medios. Cada prueba digital firmada, cada <em>timestamp</em>, es un paso hacia un sistema más justo y accesible. Menos burocracia, más transparencia.
          </p>
          <p className="text-2xl md:text-3xl font-bold text-white mb-12">
            No vendemos firmas, vendemos Verdad.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              to="/dashboard"
              className="bg-white hover:bg-gray-100 text-cyan-700 font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-0.5 text-lg"
            >
              Probar VerifySign Ahora
            </Link>
            <Link
              to="/pricing"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-cyan-700 font-bold py-4 px-10 rounded-xl transition duration-300 text-lg"
            >
              Ver Planes y Precios
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">VerifySign</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Infraestructura de Confianza Digital abierta — estándar .ECO
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/verify" className="text-gray-400 hover:text-cyan-400 transition duration-200">Verificador</Link></li>
                <li><Link to="/pricing" className="text-gray-400 hover:text-cyan-400 transition duration-200">Precios</Link></li>
                <li><a href="#how-it-works" className="text-gray-400 hover:text-cyan-400 transition duration-200">Cómo Funciona</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Recursos</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="https://github.com/verifysign" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition duration-200">GitHub</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition duration-200">Documentación</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition duration-200">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition duration-200">Privacidad</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition duration-200">Términos de Uso</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition duration-200">Contacto</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-500 mb-4 max-w-4xl mx-auto leading-relaxed">
              <strong>Transparencia Total:</strong> VerifySign no reemplaza certificaciones oficiales ni sellos gubernamentales.
              Genera evidencia técnica verificable que complementa procesos legales. La aceptación final depende del juez o perito forense.
            </p>
            <p className="text-sm text-gray-600">
              © 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;