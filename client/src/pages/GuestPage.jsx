import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Info } from 'lucide-react';

function GuestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Modo Invitado</h1>
          <p className="text-gray-600">Sube tu documento para generar un certificado .ECO</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Genera tu Certificado .ECO</h2>

            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center mb-6 hover:border-cyan-500 transition duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-10 h-10 text-cyan-600" strokeWidth={2.5} />
              </div>
              <p className="text-gray-700 mb-2 font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
              <p className="text-sm text-gray-500">PDF, DOCX, PNG, JPG, TXT o cualquier otro formato</p>
              <input
                type="file"
                className="hidden"
                id="file-upload"
              />
            </div>

            <div className="text-center">
              <label
                htmlFor="file-upload"
                className="inline-block bg-gray-100 hover:bg-gray-200 text-cyan-600 font-semibold py-3 px-8 rounded-lg transition duration-300 cursor-pointer"
              >
                Seleccionar Archivo
              </label>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-2">Email para recibir el certificado .ECO *</label>
            <input
              type="email"
              placeholder="tu@email.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <Info className="w-6 h-6 text-cyan-600 mr-4 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <h3 className="text-lg font-semibold text-cyan-700 mb-2">¿Qué es un certificado .ECO?</h3>
                <p className="text-gray-700 leading-relaxed">
                  El estándar .ECO es un formato de certificación digital que combina hash SHA-256, timestamp criptográfico y firma digital para crear pruebas de existencia, integridad y autoría verificables de forma independiente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/"
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg text-center transition duration-300"
            >
              Cancelar
            </Link>
            <button
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg"
            >
              Generar Certificado .ECO
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Al continuar, aceptas nuestros <Link to="/terms" className="text-cyan-600 hover:underline">Términos de Servicio</Link> y <Link to="/privacy" className="text-cyan-600 hover:underline">Política de Privacidad</Link>.</p>
        </div>
      </div>
    </div>
  );
}

export default GuestPage;