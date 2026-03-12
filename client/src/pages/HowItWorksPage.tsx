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
