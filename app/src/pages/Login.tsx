import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { supabase } from "../lib/supabase";
import { trackSignup } from "../lib/analytics";
import { getActiveVariant } from "../config/copyVariants";

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/dashboard'
          }
        });
        if (error) throw error;

        await trackSignup(getActiveVariant());

        alert("¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 bg-white dark:bg-neutral-950">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6 text-center">
          {isLogin
            ? "Accede a tu panel de control y gestiona tus evidencias." 
            : "Regístrate para acceder a todas las funciones de VerifySign."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Email</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-neutral-800 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Contraseña</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-neutral-800 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full" variant="primary" disabled={loading}>
            {loading ? "Cargando..." : (isLogin ? "Iniciar Sesión" : "Registrarse")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline text-sm"
            disabled={loading}
          >
            {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia Sesión"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/app/guest")}
            className="text-neutral-500 hover:underline text-sm"
            disabled={loading}
          >
            ¿Prefieres no crear cuenta? Continuar como invitado
          </button>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;