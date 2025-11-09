import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement login/register logic
    console.log('Form submitted:', { ...formData, isLogin });
    // Simulate successful login
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-2xl mb-4">
            <Lock className="w-10 h-10 text-cyan-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 mb-2">VerifySign</h1>
          <p className="text-gray-600">Plataforma de certificación digital con trazabilidad forense</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {isLogin
              ? 'Accede a tu panel de control y gestiona tus evidencias.'
              : 'Regístrate para acceder a todas las funciones de VerifySign.'}
          </p>

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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-300"
            >
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin
                ? "¿No tienes cuenta? "
                : "¿Ya tienes cuenta? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-cyan-600 hover:text-cyan-700 font-semibold"
              >
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 mb-3">¿Prefieres no crear cuenta?</p>
            <Link
              to="/guest"
              className="inline-block bg-gray-100 hover:bg-gray-200 text-cyan-600 font-semibold py-2 px-6 rounded-lg transition duration-300"
            >
              Continuar como invitado
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Al continuar, aceptas nuestros <Link to="/terms" className="text-cyan-600 hover:underline">Términos de Servicio</Link> y <Link to="/privacy" className="text-cyan-600 hover:underline">Política de Privacidad</Link>.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;