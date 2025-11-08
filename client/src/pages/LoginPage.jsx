import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-2">VerifySign</h1>
          <p className="text-slate-400">Plataforma de certificación digital con trazabilidad forense</p>
        </div>
        
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-slate-400 text-center mb-6">
            {isLogin 
              ? 'Accede a tu panel de control y gestiona tus evidencias.' 
              : 'Regístrate para acceder a todas las funciones de VerifySign.'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="email" className="block text-slate-300 mb-2">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>
            
            <div className="mb-5">
              <label htmlFor="password" className="block text-slate-300 mb-2">Contraseña *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            
            {!isLogin && (
              <div className="mb-5">
                <label htmlFor="confirmPassword" className="block text-slate-300 mb-2">Confirmar Contraseña *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-300"
            >
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              {isLogin 
                ? "¿No tienes cuenta? " 
                : "¿Ya tienes cuenta? "}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-cyan-500 hover:text-cyan-400 font-medium"
              >
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700 text-center">
            <p className="text-slate-400 mb-3">¿Prefieres no crear cuenta?</p>
            <Link 
              to="/guest" 
              className="inline-block bg-slate-700 hover:bg-slate-600 text-cyan-500 font-medium py-2 px-6 rounded-lg transition duration-300"
            >
              Continuar como invitado
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Al continuar, aceptas nuestros <Link to="/terms" className="text-cyan-500 hover:underline">Términos de Servicio</Link> y <Link to="/privacy" className="text-cyan-500 hover:underline">Política de Privacidad</Link>.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;