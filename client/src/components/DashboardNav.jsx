import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function DashboardNav({ onLogout = () => {} }) {
  const location = useLocation();
  const navItems = [
    { label: 'Inicio', to: '/dashboard/start' },
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Verificar', to: '/dashboard/verify' },
    { label: 'Precios', to: '/dashboard/pricing' }
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      onLogout();
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/dashboard/start" className="flex items-center space-x-3">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition duration-200 font-medium ${
                  location.pathname === item.to ? 'text-cyan-600 font-semibold' : 'text-gray-600 hover:text-cyan-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-200 font-medium"
            >
              Cerrar Sesión
            </button>
          </nav>
          <div className="md:hidden">
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-cyan-600 text-sm font-semibold"
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
