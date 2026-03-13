import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header variant="public" />

      <header className="pt-32 pb-20 md:pt-40 md:pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[46px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Firmar es una parte.<br />Proteger tu trabajo es el objetivo.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
            EcoSign ordena el proceso para vos, para quien participa y para quien verifica después.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-8 pb-24">
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Como funciona en la practica
          </h2>
          <p className="text-lg text-gray-700 mb-12 text-center max-w-3xl mx-auto">
            Cuatro pasos simples para proteger trabajo importante sin exponer el contenido.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Paso 1</p>
              <h3 className="text-lg font-semibold text-black mb-2">Crea una operacion</h3>
              <p className="text-sm text-gray-700">Organiza el contexto antes de empezar: acuerdo, presupuesto, entrega o proceso.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Paso 2</p>
              <h3 className="text-lg font-semibold text-black mb-2">Carga documentos y participantes</h3>
              <p className="text-sm text-gray-700">Subis lo necesario, pegas la lista de mails y EcoSign completa lo repetitivo.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Paso 3</p>
              <h3 className="text-lg font-semibold text-black mb-2">Envia el flujo</h3>
              <p className="text-sm text-gray-700">Cada persona recibe un acceso claro para revisar, firmar y continuar sin friccion.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Paso 4</p>
              <h3 className="text-lg font-semibold text-black mb-2">Conserva respaldo verificable</h3>
              <p className="text-sm text-gray-700">Al terminar, tenes evidencia lista para validar cuando haga falta.</p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Tu archivo no se expone
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto mb-10">
            EcoSign esta disenado para proteger sin abrir contenido. La plataforma no necesita leer tu documento para generar respaldo verificable.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-black mb-2">Privacidad real</h3>
              <p className="text-sm text-gray-700">No mostramos ni usamos el contenido como parte del modelo de proteccion.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-black mb-2">Control del proceso</h3>
              <p className="text-sm text-gray-700">Definis participantes, accesos y flujo desde una sola operacion.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-black mb-2">Verificacion posterior</h3>
              <p className="text-sm text-gray-700">Cuando necesites demostrar lo ocurrido, el respaldo ya esta preparado.</p>
            </div>
          </div>
        </section>

        <section className="mb-20 rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4 text-center">
            No todas las firmas resuelven el mismo problema
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto mb-6">
            Algunas soluciones cierran firma. EcoSign suma proteccion del trabajo con evidencia verificable.
          </p>
          <div className="text-center">
            <Link
              to="/comparison"
              className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:border-black hover:text-black"
            >
              Ver comparacion completa
            </Link>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4 text-center">
            Transparencia clara para todos
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto mb-8">
            Esta pagina cuenta el concepto en lenguaje simple.
            Si queres el detalle tecnico con codigo y contratos publicos, tambien lo publicamos.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-black mb-2">En esta pagina</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Que gana cada persona del flujo.</li>
                <li>• Como proteger trabajo sin vueltas tecnicas.</li>
                <li>• Como queda un respaldo verificable al final.</li>
                <li>• Que diferencia a EcoSign de una firma comun.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-6 bg-gray-50">
              <h3 className="text-lg font-semibold text-black mb-2">En GitHub tecnico</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Contratos publicos de verificacion e integracion.</li>
                <li>• Comportamientos auditables de evidencia y estados.</li>
                <li>• Formato publico de salida para verificacion externa.</li>
                <li>• Referencias tecnicas para revisiones de seguridad.</li>
              </ul>
              <p className="text-xs text-gray-600 mt-4">
                <strong>Para tecnicos:</strong> Mostramos superficie publica suficiente para auditar privacidad y verificacion.
                <br/>
                <strong>Para no tecnicos:</strong> Podes copiar esta pagina y mostrarsela a tu asesor tecnico de confianza.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/HOW_IT_WORKS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Ver filosofía y principios (GitHub)
            </a>
            <a
              href="https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/PUBLIC_VALIDATION_CONTRACT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:border-black hover:text-black"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Ver contrato de validación (GitHub)
            </a>
            <Link
              to="/documentation"
              className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:border-black hover:text-black"
            >
              Ver resumen técnico público
            </Link>
            <a
              href="https://github.com/TemporalDynamics/ecosign/tree/main/docs/public"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:border-black hover:text-black"
            >
              Abrir docs/public
            </a>
          </div>
        </section>

        <section className="text-center pt-10">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Empeza gratis y protege trabajo real
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Sin tarjeta, sin friccion inicial y con un flujo listo para usar en minutos.
          </p>
          <Link
            to="/login?mode=signup"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Proteger mi trabajo
          </Link>
        </section>
      </main>

      <FooterPublic />
    </div>
  );
}

export default HowItWorksPage;
