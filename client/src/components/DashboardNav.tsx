import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import { useLegalCenter } from '../contexts/LegalCenterContext';

function DashboardNav({ onLogout = () => {} }) {
  const location = useLocation();
  const { open: openLegalCenter } = useLegalCenter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { label: 'Inicio', to: '/inicio' },
    { label: 'Documentos', to: '/documentos' },
    { label: 'Verificador', to: '/verificador' },
    { label: 'Planes', to: '/planes' }
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
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="text-gray-900 text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
            >
              Menú
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-sm">
          <nav className="px-4 py-3 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold ${
                  location.pathname === item.to ? 'text-gray-900' : 'text-gray-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                openLegalCenter();
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left text-sm font-semibold text-gray-600"
            >
              Centro Legal
            </button>
            <button
              onClick={async () => {
                setMobileMenuOpen(false);
                await handleLogout();
              }}
              className="mt-2 py-2 text-left text-sm font-semibold text-gray-900 border-t border-gray-200"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

export default DashboardNav;
