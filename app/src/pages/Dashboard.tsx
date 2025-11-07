import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { supabase } from "../lib/supabase";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (!error) {
      navigate("/app/access");
    } else {
      console.error("Error al cerrar sesión:", error.message);
      alert("Error al cerrar sesión: " + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-[100dvh] grid place-items-center">Cargando dashboard...</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-neutral-950 p-6">
      <Card className="w-full max-w-4xl mx-auto p-6 mt-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Bienvenido, {user?.email || "Usuario"}!</h1>
          <Button onClick={handleLogout} variant="outline" disabled={loading}>
            {loading ? "Cerrando..." : "Cerrar Sesión"}
          </Button>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-8">
          Este es tu panel de control. Aquí podrás gestionar todos tus documentos y proyectos.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Mis Documentos .ECO</h2>
            <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg min-h-[150px] flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              (Placeholder) Aquí aparecerán tus certificados .ECO.
            </div>
            <Button className="mt-4 w-full" variant="primary">Generar nuevo .ECO</Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Mis Proyectos NDA</h2>
            <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg min-h-[150px] flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              (Placeholder) Aquí aparecerán tus proyectos NDA.
            </div>
            <Button className="mt-4 w-full" variant="primary">Crear nuevo NDA</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;