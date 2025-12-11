import { useState } from 'react';
import { Link } from 'react-router-dom';

const HeaderPublic = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white fixed w-full top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8 translate-y-[2px]">
            <Link to="/how-it-works" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
              Cómo funciona
            </Link>
            <Link to="/verify" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
              Verificador
            </Link>
            <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
              Precios
            </Link>
            <Link to="/news" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
              News
            </Link>
            <Link to="/login" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200 flex items-center h-10">
              Iniciar Sesión
            </Link>
            <Link
              to="/login"
              className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300 flex items-center h-10"
            >
              Comenzar Gratis
            </Link>
          </div>
          <button
            className="md:hidden text-gray-600 hover:text-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <Link to="/how-it-works" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Cómo funciona</Link>
            <Link to="/verify" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Verificador</Link>
            <Link to="/pricing" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Precios</Link>
            <Link to="/login" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Iniciar Sesión</Link>
            <Link
              to="/login"
              className="block bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2"
            >
              Comenzar Gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HeaderPublic;
