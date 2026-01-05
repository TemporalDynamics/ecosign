import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';

function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });

      if (error) throw error;

      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error('❌ Error al enviar email de recuperación:', err);
      
      let errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      if (errorMessage.includes('Email not found')) {
        errorMessage = 'No existe una cuenta con este email';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'Demasiados intentos. Intentá nuevamente en unos minutos';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="public" />

      <div className="flex-grow flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Recuperar contraseña</h1>
            <p className="text-gray-600">
              {success 
                ? 'Revisá tu email para continuar'
                : 'Ingresá tu email y te enviaremos instrucciones'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border-2 border-gray-200">
            {success ? (
              <>
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm font-medium mb-2">✅ Email enviado</p>
                  <p className="text-green-700 text-sm">
                    Revisá tu bandeja de entrada y seguí las instrucciones para restablecer tu contraseña.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>¿No recibiste el email?</strong>
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Verificá tu carpeta de spam</li>
                    <li>Confirmá que el email sea correcto</li>
                    <li>Esperá unos minutos y volvé a intentar</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setSuccess(false)}
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Enviar nuevamente
                  </button>
                  
                  <Link
                    to="/login"
                    className="block w-full text-center bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Volver al inicio de sesión
                  </Link>
                </div>
              </>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-5">
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                      </span>
                    ) : (
                      'Enviar instrucciones'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-black transition text-sm"
                  >
                    ← Volver al inicio de sesión
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <FooterPublic />
    </div>
  );
}

export default RecuperarContrasenaPage;
