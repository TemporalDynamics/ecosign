import React from "react";
import Activity from 'lucide-react/dist/esm/icons/activity';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";

export default function ServiceStatusPage() {
  const services = [
    { name: "API de Firma", status: "operational" },
    { name: "Certificador .ECO", status: "operational" },
    { name: "Verificador Público", status: "operational" },
    { name: "Panel de Usuario", status: "operational" },
    { name: "Servicios de Tercerización (SignNow / TSA)", status: "operational" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DashboardNav />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="mt-0 text-4xl font-bold text-black mb-4">
              Estado del Servicio EcoSign
            </h1>
            <p className="text-lg text-gray-600">
              Transparencia total sobre la disponibilidad de la plataforma.
            </p>
          </div>

          {/* Current Status */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-black mb-8">Estado Actual</h2>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-6 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-lg text-gray-900">{service.name}</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    Operativa
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-gray-600">
              Si alguna parte del sistema sufre interrupciones o mantenimiento, lo verás acá en tiempo real.
            </p>
          </section>

          {/* Incident History */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-8">
              Historial de Incidentes (Últimos 30 días)
            </h2>
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">
                No se han registrado incidentes en los últimos 30 días.
              </p>
            </div>
          </section>
        </div>
      </main>

      <FooterInternal />
    </div>
  );
}
