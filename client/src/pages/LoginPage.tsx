import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import { disableGuestMode } from '../utils/guestMode';
import { initializeSessionCrypto } from '../lib/e2e/sessionCrypto';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [cryptoInitializing, setCryptoInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    setIsLogin(mode !== 'signup');
  }, [location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null); // Clear errors on input change
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = getSupabase();
      if (isLogin) {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        console.log('✅ Login exitoso:', data.user.email);
        
        // Inicializar sesión crypto inmediatamente después del login
        setCryptoInitializing(true);
        await initializeSessionCrypto(data.user.id);
        console.log('✅ Sesión crypto inicializada para:', data.user.id);
        
        disableGuestMode();
        setSuccess('¡Bienvenido de nuevo!');

        // Redirigir a la página de inicio cuando crypto esté listo
        navigate('/inicio');
      } else {
        // REGISTRO
        // Validar que las contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }

        // Validar contraseña mínima (Supabase requiere 6+ caracteres)
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/inicio`,
          }
        });

        if (error) throw error;

        console.log('✅ Registro exitoso:', data.user?.email);
        setSuccess('¡Cuenta creada! Por favor revisa tu email para confirmar tu cuenta.');

        // Limpiar formulario
        setFormData({ email: '', password: '', confirmPassword: '' });
      }
    } catch (err) {
      console.error('❌ Error de autenticación:', err);

      // Mensajes de error amigables
      let errorMessage = err instanceof Error ? err.message : 'Error desconocido';

      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'Este email ya está registrado';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Por favor confirma tu email antes de iniciar sesión';
      } else if (errorMessage.includes('Password should be at least 6 characters')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setCryptoInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="public" />

      <div className="flex-grow flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
              <svg className="w-8 h-8 text-white" strokeWidth={2.5} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">EcoSign</h1>
            <p className="text-gray-600">Certificación digital con privacidad total</p>
          </div>

        <div className="bg-white p-8 rounded-xl border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-center text-black mb-2">
            {isLogin ? 'Iniciar Sesión' : 'Creá tu cuenta gratuita'}
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {isLogin
              ? 'Accede a tu panel de control y gestiona tus documentos.'
              : 'Accedé al plan gratuito de EcoSign. No pedimos tarjeta ni datos de pago.'}
          </p>
          {!isLogin && (
            <div className="mb-6 text-sm text-gray-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Firmá y protegé documentos</li>
                <li>Evidencia técnica verificable</li>
                <li>Control total de tus archivos</li>
              </ul>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">✅ {success}</p>
            </div>
          )}
          {cryptoInitializing && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700 text-sm font-medium">Inicializando cifrado seguro...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                placeholder="tu@email.com"
              />
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Contraseña *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div className="mb-5">
                <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">Confirmar Contraseña *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </span>
              ) : (
                isLogin ? 'Iniciar Sesión' : 'Crear cuenta gratis'
              )}
            </button>
            {!isLogin && (
              <p className="mt-3 text-xs text-gray-500 text-center">
                Tu cuenta queda activa automáticamente en el plan gratuito.
              </p>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin
                ? "¿No tienes cuenta? "
                : "¿Ya tienes cuenta? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-black hover:underline font-semibold"
              >
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-700 mb-2">¿Querés probar sin registrarte?</p>
            <p className="text-sm text-gray-600 mb-4">
              Entrá como invitado y explorá EcoSign sin crear una cuenta.
            </p>
            <div className="text-sm text-gray-700 mb-4">
              <p className="font-semibold mb-2">Como invitado podés:</p>
              <ul className="space-y-1">
                <li>Subir un documento</li>
                <li>Ver el flujo completo</li>
                <li>Obtener un sello de tiempo</li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Los documentos creados como invitado no tienen validez legal.
              </p>
            </div>
            <Link
              to="/inicio?guest=true"
              className="inline-block bg-white border-2 border-black text-black hover:bg-black hover:text-white font-semibold py-2 px-6 rounded-lg transition duration-300"
            >
              Entrar como invitado
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              No guardamos tus documentos ni accedemos a su contenido.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Al continuar, aceptas nuestros <Link to="/terms" className="text-black hover:underline font-medium">Términos de Servicio</Link> y <Link to="/privacy" className="text-black hover:underline font-medium">Política de Privacidad</Link>.</p>
        </div>
        </div>
      </div>
      
      <FooterPublic />
    </div>
  );
}

export default LoginPage;
