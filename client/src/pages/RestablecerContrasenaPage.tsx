import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';

function RestablecerContrasenaPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar que hay un hash de recuperación en la URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (!accessToken) {
      setError('Enlace inválido o expirado. Solicitá un nuevo enlace de recuperación.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      // Validar contraseña mínima
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('❌ Error al restablecer contraseña:', err);
      
      let errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      if (errorMessage.includes('Password should be at least 6 characters')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      } else if (errorMessage.includes('New password should be different')) {
        errorMessage = 'La nueva contraseña debe ser diferente a la anterior';
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Nueva contraseña</h1>
            <p className="text-gray-600">
              {success 
                ? 'Contraseña actualizada correctamente'
                : 'Ingresá tu nueva contraseña'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border-2 border-gray-200">
            {success ? (
              <>
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm font-medium mb-2">✅ Contraseña actualizada</p>
                  <p className="text-green-700 text-sm">
                    Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión...
                  </p>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Ir a iniciar sesión
                </button>
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
                    <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                      Nueva contraseña *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mínimo 6 caracteres
                    </p>
                  </div>

                  <div className="mb-5">
                    <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                      Confirmar contraseña *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="••••••••"
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
                        Guardando...
                      </span>
                    ) : (
                      'Cambiar contraseña'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <FooterPublic />
    </div>
  );
}

export default RestablecerContrasenaPage;
