import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';

function DashboardStartPage() {
  const navigate = useNavigate();
  const handleLogout = () => navigate('/');

  return (
    <div className="min-h-screen bg-white">
      <DashboardNav onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <section className="text-center bg-gray-50 rounded-3xl p-10 shadow-lg border border-gray-200">
          <p className="text-gray-500 font-semibold tracking-[0.2em] uppercase mb-4">workspace</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Tu centro de evidencias .ECO</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Desde acá podés certificar, compartir bajo NDA y verificar tus documentos sin salir del entorno autenticado. Elegí una acción para continuar.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/dashboard" className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-xl shadow hover:shadow-lg transition text-center">
              Ir al Dashboard
            </Link>
            <Link to="/dashboard/verify" className="bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center">
              Verificar un .ECO
            </Link>
            <Link to="/dashboard/pricing" className="bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center">
              Ver planes internos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardStartPage;
