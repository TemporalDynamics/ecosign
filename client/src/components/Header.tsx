import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

interface HeaderProps {
  variant: 'public' | 'private';
  onLogout?: () => void;
  openLegalCenter?: () => void;
}

const PublicNavDesktop = () => (
  <>
    <Link to="/how-it-works" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
      Cómo funciona
    </Link>
    <Link to="/verify" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
      Verificador
    </Link>
    <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
      Precios
    </Link>
    <Link
      to="/login"
      className="border border-[#0E4B8B] text-[#0E4B8B] hover:bg-[#0E4B8B] hover:text-white font-semibold px-4 py-2 rounded-lg transition duration-200 flex items-center h-10"
    >
      Iniciar Sesión
    </Link>
  </>
);

const PrivateNavDesktop = ({ onLogout, openLegalCenter }: { onLogout: () => void; openLegalCenter: () => void; }) => {
  const location = useLocation();
  const navItems = [
    { label: 'Inicio', to: '/inicio' },
    { label: 'Documentos', to: '/documentos' },
    { label: 'Verificador', to: '/verificador' },
    { label: 'Planes', to: '/planes' }
  ];

  return (
    <>
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
        onClick={openLegalCenter}
        className="transition duration-200 font-medium text-gray-600 hover:text-gray-900 flex items-center h-10"
      >
        Centro Legal
      </button>
      <button
        onClick={onLogout}
        className="border border-[#0E4B8B] text-[#0E4B8B] hover:bg-[#0E4B8B] hover:text-white px-4 py-2 rounded-lg transition duration-200 font-semibold"
      >
        Cerrar Sesión
      </button>
    </>
  );
};

const PublicNavMobile = ({ setMobileMenuOpen }: { setMobileMenuOpen: (value: boolean) => void }) => (
    <div className="px-4 pt-2 pb-4 space-y-2">
        <Link onClick={() => setMobileMenuOpen(false)} to="/how-it-works" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Cómo funciona</Link>
        <Link onClick={() => setMobileMenuOpen(false)} to="/verify" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Verificador</Link>
        <Link onClick={() => setMobileMenuOpen(false)} to="/pricing" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Precios</Link>
        <Link
          onClick={() => setMobileMenuOpen(false)}
          to="/login"
          className="block border border-[#0E4B8B] text-[#0E4B8B] hover:bg-[#0E4B8B] hover:text-white font-semibold px-3 py-2 rounded-lg text-center"
        >
          Iniciar Sesión
        </Link>
    </div>
);

const PrivateNavMobile = ({ onLogout, openLegalCenter, setMobileMenuOpen }: { onLogout: () => void; openLegalCenter: () => void; setMobileMenuOpen: (value: boolean) => void }) => {
    const location = useLocation();
    const navItems = [
        { label: 'Inicio', to: '/inicio' },
        { label: 'Documentos', to: '/documentos' },
        { label: 'Verificador', to: '/verificador' },
        { label: 'Planes', to: '/planes' }
    ];

    return (
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
                await onLogout();
            }}
            className="mt-2 py-2 text-left text-sm font-semibold text-gray-900 border-t border-gray-200"
            >
            Cerrar sesión
            </button>
        </nav>
    );
};

const Header = ({ variant, onLogout = () => {}, openLegalCenter = () => {} }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Logo to={variant === 'public' ? '/' : '/inicio'} variant="option-c" />
          <nav className="hidden md:flex items-center space-x-8 translate-y-[2px]">
            {variant === 'public' ? <PublicNavDesktop /> : <PrivateNavDesktop onLogout={onLogout} openLegalCenter={openLegalCenter} />}
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
            {variant === 'public' ? <PublicNavMobile setMobileMenuOpen={setMobileMenuOpen} /> : <PrivateNavMobile onLogout={onLogout} openLegalCenter={openLegalCenter} setMobileMenuOpen={setMobileMenuOpen} />}
        </div>
      )}
    </header>
  );
};

export default Header;
