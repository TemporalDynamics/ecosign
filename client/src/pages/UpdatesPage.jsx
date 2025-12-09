import React from "react";
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";

export default function UpdatesPage() {
  return (
    <>
      <DashboardNav />
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-24">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-black">
            Novedades de EcoSign
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Cambios, mejoras y correcciones en tiempo real.
          </p>
          <p className="mt-6 text-base text-gray-700">
            Esta sección registra la evolución de EcoSign versión por versión.
            Como estamos en fase de MVP privado, las novedades se enfocan en
            estabilidad, experiencia de uso y calidad de la evidencia, antes de
            abrir el producto al público general.
          </p>
        </header>

        {/* Versión 0.9 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <h2 className="text-2xl font-bold text-black">
              Versión 0.9 — MVP Privado (Lanzado hoy)
            </h2>
          </div>
          <p className="text-base text-gray-700 mb-6">
            Primer versión estable destinada a testers profesionales y estudios jurídicos.
          </p>

          {/* Novedades principales */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-3">
              Novedades principales
            </h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Certificación .ECO sin subir documentos (Zero-Knowledge)</li>
              <li>• Firma Legal ilimitada</li>
              <li>• Firma Certificada integrada</li>
              <li>• Registro de auditoría completo</li>
              <li>• Blindaje Forense básico: hash + timestamp legal</li>
              <li>• Verificador público .ECO</li>
              <li>• Dashboard con inicio rápido y rutas simplificadas</li>
            </ul>
          </div>

          {/* Mejoras visuales */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-3">
              🔧 Mejoras visuales
            </h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Nuevo footer público y footer privado coherentes</li>
              <li>• Espacios consistentes entre contenido y footer</li>
              <li>• Tipografías unificadas</li>
              <li>• Home interna más limpia y clara</li>
              <li>• Nuevos íconos minimalistas</li>
              <li>• Biblioteca de videos integrada</li>
            </ul>
          </div>

          {/* Correcciones */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-3">
              🧩 Correcciones
            </h3>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>• Header fijo para todas las páginas</li>
              <li>• Scroll reset automático al hacer tap en cualquier link</li>
              <li>• Mejora en carga de archivos grandes</li>
              <li>• Mayor estabilidad del verificador</li>
            </ul>
          </div>
        </section>

        {/* Próximas mejoras */}
        <section className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-black mb-4">
            🔜 Próximas mejoras (en los próximos días)
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Página interna para "Reportar un problema"</li>
            <li>• Vista simplificada para firmantes invitados</li>
            <li>• Notificaciones por email más claras</li>
            <li>• Mejor soporte para PDF con varias firmas previas</li>
            <li>• Optimización del verificador para móviles</li>
          </ul>
        </section>
      </main>
      <FooterInternal />
    </>
  );
}
