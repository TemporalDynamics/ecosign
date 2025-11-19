import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white fixed w-full top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-black">VerifySign</span>
            </Link>
            <Link
              to="/"
              className="text-gray-600 hover:text-black font-medium transition duration-200"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <Mail className="w-12 h-12 text-black mx-auto mb-6" />
          
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-8">
            Contacto
          </h1>

          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              Podés comunicarte con nosotros por email:
            </p>

            <div className="bg-gray-100 rounded-xl p-8 max-w-2xl mx-auto">
              <a
                href="mailto:soporte@ecosign.app"
                className="text-2xl font-semibold text-black hover:underline"
              >
                📧 soporte@ecosign.app
              </a>
            </div>

            <p className="text-gray-600">
              Próximamente habilitaremos un formulario de contacto.
            </p>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200">
            <Link
              to="/"
              className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition duration-300"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactPage;
