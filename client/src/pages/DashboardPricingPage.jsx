import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';

const plans = [
  {
    name: 'Básico',
    price: 'Gratis',
    description: 'Ideal para prototipos y pruebas rápidas',
    features: [
      'Hasta 5 certificaciones .ECO',
      'Compartir vía VerifyTracker (NDA simple)',
      'Acceso al dashboard y verificador interno'
    ],
    button: 'Seguir en Básico'
  },
  {
    name: 'Profesional',
    price: '$29/mes',
    description: 'Para equipos que certifican a diario',
    features: [
      'Certificaciones ilimitadas',
      'VerifyTracker ilimitado y NDA avanzado',
      'Timestamps legales (RFC 3161) incluidos',
      'Soporte prioritario'
    ],
    button: 'Actualizar a Profesional',
    popular: true
  },
  {
    name: 'Empresarial',
    price: 'Hablar con nosotros',
    description: 'Integración API, auditorías y soporte dedicado',
    features: [
      'Planes multi-equipo',
      'Onboarding privado y training',
      'SLA y reporting avanzado'
    ],
    button: 'Contactar ventas'
  }
];

function DashboardPricingPage() {
  const navigate = useNavigate();
  const handleLogout = () => navigate('/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      <DashboardNav onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-600 mb-3">PLANES INTERNOS</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Escalá tu veracidad digital</h1>
          <p className="text-gray-600">Cambiar de plan no te saca del dashboard. Elegí el que mejor se adapte a tu flujo.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative bg-white rounded-2xl shadow-lg border ${plan.popular ? 'border-cyan-500' : 'border-gray-200'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  MÁS USADO
                </div>
              )}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 mb-3">{plan.price}</p>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8 text-sm text-gray-700">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-semibold ${plan.popular ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : 'bg-gray-100 text-cyan-700'}`}>
                  {plan.button}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default DashboardPricingPage;
