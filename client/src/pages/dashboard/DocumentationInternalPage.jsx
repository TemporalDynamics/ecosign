import React from 'react';
import { Link } from 'react-router-dom';
import DashboardNav from '../../components/DashboardNav';
import FooterInternal from '../../components/FooterInternal';
import PageTitle from '../../components/PageTitle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Database from 'lucide-react/dist/esm/icons/database';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Shield from 'lucide-react/dist/esm/icons/shield';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';

export default function DocumentationInternalPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DashboardNav />
      
      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="EcoSign no te pide que confíes: te da las herramientas para verificar por tu cuenta. Esta documentación está dirigida a desarrolladores, auditores, peritos forenses y equipos de seguridad que necesitan entender cómo funciona la evidencia en profundidad.">
            Documentación Técnica de EcoSign
          </PageTitle>
          
          {/* Contenedor Portable .ECO */}
          <section className="mt-8 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-[#0A66C2]" />
              <h2 className="text-2xl font-bold text-black">Contenedor Portable .ECO</h2>
            </div>
            <p className="text-lg text-gray-700 mb-4">
              El archivo .ECO es un contenedor portable que incluye:
            </p>
            <ul className="space-y-3 text-gray-700 ml-6">
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>La huella digital (SHA-256)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>El Registro de Operaciones (ChainLog)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>Timestamps legales</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>Sellos blockchain</span>
              </li>
            </ul>
            <p className="text-lg text-gray-700 mt-4">
              No contiene el documento original. Es pequeño, robusto y verificable por cualquier tercero.
            </p>
          </section>

          {/* Registro de Operaciones */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-[#0A66C2]" />
              <h2 className="text-2xl font-bold text-black">Registro de Operaciones (ChainLog)</h2>
            </div>
            <p className="text-lg text-gray-700 mb-4">
              Cada acción relevante (firma, envío, apertura, validación) se registra en un log append-only.
              Esto garantiza una Cadena de Custodia clara y una trazabilidad imposible de modificar.
            </p>
          </section>

          {/* Triple Anclaje */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-[#0A66C2]" />
              <h2 className="text-2xl font-bold text-black">Triple Anclaje Criptográfico</h2>
            </div>
            <p className="text-lg text-gray-700 mb-4">
              EcoSign utiliza una combinación de:
            </p>
            <ul className="space-y-3 text-gray-700 ml-6">
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>SHA-256 (integridad del documento)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>RFC 3161 (sello de tiempo legal)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#0A66C2] mt-1">•</span>
                <span>Blockchain pública (Polygon y Bitcoin vía OpenTimestamps)</span>
              </li>
            </ul>
            <p className="text-lg text-gray-700 mt-4">
              Esta estructura asegura inmutabilidad y fecha cierta legal.
            </p>
          </section>

          {/* Verificación Independiente */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-[#0A66C2]" />
              <h2 className="text-2xl font-bold text-black">Verificación Independiente</h2>
            </div>
            <p className="text-lg text-gray-700">
              Cualquier persona puede validar un archivo .ECO sin depender de EcoSign.
              El verificador reproduce la evidencia y determina si el documento fue alterado.
            </p>
          </section>

          {/* Link a GitHub */}
          <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-xl font-bold text-black mb-3">Para Desarrolladores</h3>
            <p className="text-gray-700 mb-4">
              Si querés profundizar en los detalles técnicos, revisá nuestra documentación completa en GitHub:
            </p>
            <a
              href="https://github.com/TemporalDynamics/verifysign/blob/main/COMO%20LO%20HACEMOS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0A66C2] hover:underline font-medium"
            >
              Ver Documentación Técnica Completa →
            </a>
          </div>
        </div>
      </main>

      <FooterInternal />
    </div>
  );
}
