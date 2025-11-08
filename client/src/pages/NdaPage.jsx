import React from 'react';
import { Link } from 'react-router-dom';

function NdaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Acuerdo de Confidencialidad</h1>
          <p className="text-slate-400">Documento que requiere firma digital para acceso</p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Información del Documento</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm">Nombre del Documento</div>
                  <div className="text-white font-medium">Acuerdo de Confidencialidad - Proyecto Alpha</div>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm">ID del Documento</div>
                  <div className="text-white font-medium">DOC-2025-001</div>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm">Fecha de Creación</div>
                  <div className="text-white font-medium">10 Nov 2025</div>
                </div>
              </div>
              
              <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6 mb-6">
                <div className="flex items-start">
                  <div className="text-2xl text-amber-500 mr-4">⚠️</div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-400 mb-2">Importante</h3>
                    <p className="text-slate-300">
                      Al firmar este acuerdo, aceptas mantener la confidencialidad de toda la información contenida en el documento. 
                      Tu firma será registrada con sello de tiempo criptográfico y generará un certificado .ECO de trazabilidad forense.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Términos del Acuerdo</h2>
              <div className="bg-slate-700/50 rounded-lg p-6 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-3">Definición de Información Confidencial</h3>
                <p className="text-slate-300 mb-4">
                  Se considera información confidencial cualquier dato, documento, plan, producto, servicio o tecnología divulgado por una de las partes a la otra, ya sea en forma oral, escrita o electrónica, que:
                </p>
                <ul className="list-disc pl-6 text-slate-300 space-y-2 mb-4">
                  <li>Esté identificado como confidencial en el momento de su divulgación</li>
                  <li>Por su naturaleza y circunstancias de divulgación, razonablemente se entienda que es confidencial</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mb-3">Obligaciones del Receptor</h3>
                <p className="text-slate-300 mb-4">
                  El receptor de la información confidencial se compromete a:
                </p>
                <ol className="list-decimal pl-6 text-slate-300 space-y-2 mb-4">
                  <li>Mantener en estricta confidencialidad la información recibida</li>
                  <li>Utilizar la información exclusivamente para los fines específicos acordados</li>
                  <li>No revelar la información a terceros sin consentimiento previo por escrito</li>
                  <li>Aplicar las mismas medidas de seguridad que utiliza para proteger su propia información confidencial</li>
                  <li>Devolver o destruir toda la información confidencial cuando concluya su relación contractual</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mb-3">Duración del Acuerdo</h3>
                <p className="text-slate-300">
                  Las obligaciones de confidencialidad derivadas de este acuerdo tendrán una vigencia de cinco (5) años contados desde la fecha de su firma, a menos que se acuerde una duración diferente por escrito entre las partes.
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Información del Firmante</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-300 mb-2">Nombre Completo *</label>
                  <input 
                    type="text" 
                    placeholder="Tu nombre completo" 
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2">Email *</label>
                  <input 
                    type="email" 
                    placeholder="tu@email.com" 
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Firma Digital</h2>
              <div className="bg-slate-700/50 rounded-lg p-6 mb-4">
                <div className="border-2 border-dashed border-slate-500 rounded-lg h-48 flex items-center justify-center">
                  <p className="text-slate-400">Área para firma digital</p>
                </div>
                <div className="flex justify-between mt-4">
                  <button className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                    Limpiar Firma
                  </button>
                  <button className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                    Guardar Firma
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-start mb-6 bg-slate-700/50 p-4 rounded-lg">
                <input type="checkbox" id="accept-terms" className="mt-1 mr-3 h-5 w-5 text-cyan-600 rounded focus:ring-cyan-500" />
                <label htmlFor="accept-terms" className="text-slate-300">
                  He leído y acepto los términos del acuerdo de confidencialidad. Entiendo que mi acceso será registrado y que este acuerdo tiene validez legal.
                </label>
              </div>

              <div className="flex items-start mb-6">
                <input type="checkbox" id="data-consent" className="mt-1 mr-3 h-5 w-5 text-cyan-600 rounded focus:ring-cyan-500" />
                <label htmlFor="data-consent" className="text-slate-300">
                  Consentimiento para procesamiento de datos: Acepto que mis datos personales sean tratados conforme a la política de privacidad para fines de verificación y cumplimiento legal.
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/login" 
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-300"
              >
                Cancelar
              </Link>
              <button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Firmar y Acceder al Documento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NdaPage;