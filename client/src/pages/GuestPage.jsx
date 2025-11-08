import React from 'react';
import { Link } from 'react-router-dom';

function GuestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Modo Invitado</h1>
          <p className="text-slate-400">Sube tu documento para generar un certificado .ECO</p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Genera tu Certificado .ECO</h2>
            
            <div className="bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-xl p-12 text-center mb-6">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-slate-400 mb-4">Arrastra tu archivo aquí o haz clic para seleccionar</p>
              <p className="text-sm text-slate-500">PDF, DOCX, PNG, JPG, TXT o cualquier otro formato</p>
              <input 
                type="file" 
                className="hidden" 
                id="file-upload"
              />
            </div>
            
            <div className="text-center">
              <label 
                htmlFor="file-upload"
                className="inline-block bg-slate-700 hover:bg-slate-600 text-cyan-500 font-medium py-2 px-6 rounded-lg transition duration-300 cursor-pointer"
              >
                Seleccionar Archivo
              </label>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-slate-300 mb-2">Email para recibir el certificado .ECO *</label>
            <input 
              type="email" 
              placeholder="tu@email.com" 
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <div className="text-2xl text-amber-500 mr-4">ℹ️</div>
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">¿Qué es un certificado .ECO?</h3>
                <p className="text-slate-300">
                  El estándar .ECO es un formato de certificación digital que combina hash SHA-256, timestamp criptográfico y firma digital para crear pruebas de existencia, integridad y autoría verificables de forma independiente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/" 
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-300"
            >
              Cancelar
            </Link>
            <button 
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Generar Certificado .ECO
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Al continuar, aceptas nuestros <Link to="/terms" className="text-cyan-500 hover:underline">Términos de Servicio</Link> y <Link to="/privacy" className="text-cyan-500 hover:underline">Política de Privacidad</Link>.</p>
        </div>
      </div>
    </div>
  );
}

export default GuestPage;