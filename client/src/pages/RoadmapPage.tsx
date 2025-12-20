import React from "react";
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";
import InhackeableTooltip from "../components/InhackeableTooltip";

export default function RoadmapPage() {
  return (
    <>
      <DashboardNav />
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-24">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-black">
            Roadmap Público de EcoSign
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Transparencia sobre lo que estamos construyendo y hacia dónde vamos.
          </p>
          <p className="mt-6 text-base text-gray-700">
            EcoSign está en una etapa de MVP privado con testers seleccionados.
            Este roadmap resume qué ya podés usar hoy y qué estamos preparando
            para los próximos meses, con foco en privacidad total, evidencia
            verificable y estabilidad para uso profesional.
          </p>
        </header>

        {/* Fase Actual */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <h2 className="text-2xl font-bold text-black">
              Fase Actual (MVP Privado – En Progreso)
            </h2>
          </div>
          <p className="text-base text-gray-700 mb-4">
            Versión inicial para primeros testers seleccionados.
          </p>
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-black mb-3">Incluye:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Certificación .ECO con privacidad total (Zero-Knowledge)</li>
              <li>• Firma Legal ilimitada</li>
              <li>• Firma Certificada integrada</li>
              <li>• Blindaje <InhackeableTooltip className="font-semibold" /> básico (SHA-256 + sello legal + anchoring)</li>
              <li>• Verificador público .ECO</li>
              <li>• Dashboard funcional</li>
              <li>• Auditoría completa (evento, hora, IP, hash)</li>
              <li>• Invitación a firmantes sin cuenta</li>
              <li>• Biblioteca de videos educativos</li>
            </ul>
            <p className="mt-4 text-sm text-gray-600 italic">
              Objetivo: Validar experiencia real de profesionales, estudios jurídicos 
              y equipos corporativos antes del lanzamiento público.
            </p>
          </div>
        </section>

        {/* Próximamente */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <h2 className="text-2xl font-bold text-black">
              Próximamente (0–30 días)
            </h2>
          </div>
          <p className="text-base text-gray-700 mb-4">
            Ajustes basados en feedback directo de testers.
          </p>
          <ul className="space-y-2 text-gray-700 ml-4">
            <li>• Flujo de firma múltiple mejorado</li>
            <li>• QR para compartir verificaciones</li>
            <li>• Reporte de problemas dentro del dashboard</li>
            <li>• Packs de evidencia simplificados (PDF + .ECO)</li>
            <li>• Mejoras en rendimiento del verificador</li>
            <li>• Compatibilidad ampliada para archivos grandes</li>
            <li>• Documentación técnica extendida</li>
          </ul>
        </section>

        {/* En Desarrollo */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <h2 className="text-2xl font-bold text-black">
              En Desarrollo (30–90 días)
            </h2>
          </div>
          <p className="text-base text-gray-700 mb-4">
            Primer lanzamiento público controlado.
          </p>
          <ul className="space-y-2 text-gray-700 ml-4">
            <li>• Blindaje <InhackeableTooltip className="font-semibold" /> completo (blockchain Polygon + Bitcoin/OTS, más redes en camino)</li>
            <li>• Panel para equipos (roles, permisos, actividad interna)</li>
            <li>• Historial de documentos centralizado</li>
            <li>• API inicial para integraciones (webhooks básicos)</li>
            <li>• Verificación automática de firmas múltiples</li>
            <li>• Dashboard móvil mejorado</li>
          </ul>
        </section>

        {/* En Investigación */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <h2 className="text-2xl font-bold text-black">
              En Investigación / Backlog Estratégico
            </h2>
          </div>
          <p className="text-base text-gray-700 mb-4">
            Línea de crecimiento a futuro (sin fechas exactas).
          </p>
          <ul className="space-y-2 text-gray-700 ml-4">
            <li>• Firma biométrica avanzada (opt-in)</li>
            <li>• Carpeta Segura compatible con .ECO</li>
            <li>• Exportaciones multi-formato de evidencia</li>
            <li>• Extensiones para Chrome/Firefox</li>
            <li>• Integración con sistemas legales LATAM (RUBRIC, Notariado Digital)</li>
            <li>• Análisis de integridad avanzado (detección de PDFs alterados en firma incremental)</li>
          </ul>
        </section>

        {/* Tu feedback importa */}
        <section className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-black mb-3">
            Tu feedback importa
          </h2>
          <p className="text-gray-700">
            EcoSign evoluciona con cada comentario.
            Si sos tester privado, envianos tus sugerencias a:
          </p>
          <a 
            href="mailto:soporte@email.ecosign.app"
            className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium"
          >
            📧 soporte@email.ecosign.app
          </a>
        </section>
      </main>
      <FooterInternal />
    </>
  );
}
