import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import { useLegalCenter } from '../contexts/LegalCenterContext';

function DashboardNav({ onLogout = () => {} }) {
  const location = useLocation();
  const { open: openLegalCenter } = useLegalCenter();
  const navItems = [
    { label: 'Inicio', to: '/inicio' },
    { label: 'Documentos', to: '/dashboard/documents' },
    { label: 'Verificador', to: '/dashboard/verify' },
    { label: 'Planes', to: '/dashboard/pricing' }
  ];

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error al cerrar sesión:', error);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Always call onLogout to redirect, even if there's an error
      onLogout();
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/inicio" className="flex items-center space-x-3">
            <span className="text-2xl font-extrabold text-gray-900">EcoSign</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8 translate-y-[2px]">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition duration-200 font-medium flex items-center h-10 ${
                  location.pathname === item.to ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => openLegalCenter()}
              className="transition duration-200 font-medium text-gray-600 hover:text-gray-900 flex items-center h-10"
            >
              Centro Legal
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg transition duration-200 font-medium"
            >
              Cerrar Sesión
            </button>
          </nav>
          <div className="md:hidden">
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 text-sm font-semibold"
              aria-label="Cerrar sesión"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DashboardNav;
