import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, UserCheck, Info } from "lucide-react";
import { Backdrop, Card, Button } from "../components/ui";

type Mode = "guest" | "account" | null;

function AccessGateway({ open = true, asPage = true, onClose }: { open?: boolean; asPage?: boolean; onClose?: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode>(null);
  const navigate = useNavigate();
  const startRef = useRef<HTMLDivElement>(null);

  // Trap focus when used as modal
  useEffect(() => {
    if (!asPage && open) startRef.current?.focus();
  }, [open, asPage]);

  function proceed() {
    if (mode === "guest") navigate("/app/guest");
    if (mode === "account") navigate("/app/login");
  }

  const steps = [
    {
      id: 1,
      title: "Elegí cómo querés usar VerifySign",
      body: (
        <div className="grid sm:grid-cols-2 gap-5">
          {/* GUEST */}
          <Card className={`p-5 ${mode === "guest" ? "ring-2 ring-blue-500" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold"> Modo Invitado</h3>
            </div>
            <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
              <li>✔ Generá evidencia verificable (.ECO)</li>
              <li>✔ No guardamos tus datos ni historial</li>
              <li>⚠ Sin panel ni seguimiento de casos</li>
            </ul>
            <div className="mt-4">
              <Button variant="outline" className="w-full" onClick={() => { setMode("guest"); setStep(2); }}>
                Continuar como Invitado
              </Button>
            </div>
          </Card>

          {/* ACCOUNT */}
          <Card className={`p-5 ${mode === "account" ? "ring-2 ring-blue-500" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold"> Modo Registrado</h3>
            </div>
            <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
              <li>✔ Dashboard y proyectos con NDA</li>
              <li>✔ Auditorías y expedientes (.ECOX)</li>
              <li>✔ Revocar, reenviar o eliminar evidencia</li>
            </ul>
            <div className="mt-4">
              <Button variant="primary" className="w-full" onClick={() => { setMode("account"); setStep(2); }}>
                Iniciar Sesión / Crear Cuenta
              </Button>
            </div>
          </Card>
        </div>
      ),
    },
    {
      id: 2,
      title: mode === "guest" ? "Resumen: Vas a usar VerifySign como Invitado" : "Resumen: Vas a usar VerifySign con Cuenta",
      body: (
        <div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Qué obtenés</h4>
              <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                {mode === "guest" ? (
                  <>
                    <li>• Certificado portable <b>.ECO</b> enviado a tu email</li>
                    <li>• Hash + timestamp + sello de no-repudio</li>
                    <li>• Sin necesidad de cuenta</li>
                  </>
                ) : (
                  <>
                    <li>• Panel con historial y casos</li>
                    <li>• Expedientes verificables <b>.ECOX</b></li>
                    <li>• Gestión de NDA, revocar accesos, reenviar enlaces</li>
                  </>
                )}
              </ul>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-2">Privacidad y seguridad</h4>
              <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                <li>• Tus archivos y metadatos son tuyos</li>
                <li>• No vendemos ni compartimos datos con terceros</li>
                <li>• Cifrado en tránsito y en reposo. Opcional WebAuthn</li>
              </ul>
            </Card>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>← Volver</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Ver detalles legales</Button>
              <Button variant={mode === "guest" ? "primary" : "success"} onClick={proceed}>
                {mode === "guest" ? "Continuar como Invitado" : "Continuar al Login"}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Aviso Legal claro y directo",
      body: (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 mt-0.5"/>
            <div className="text-sm text-neutral-700 dark:text-neutral-200 space-y-2">
              <p>
                VerifySign no reemplaza certificaciones oficiales, notariales o sellos gubernamentales.
                Nuestra tecnología aporta <b>evidencia técnica de autenticidad y trazabilidad</b> útil como prueba
                complementaria en procesos legales.
              </p>
              <p>
                La aceptación final de esta evidencia depende del juez o perito forense digital que evalúe el caso.
                En EE.UU. y muchos países que reconocen firma electrónica con timestamp, este tipo de evidencia
                puede respaldar reclamos de autoría, integridad o acceso.
              </p>
              <p className="text-xs opacity-70">
                Al continuar, aceptás nuestros <a className="underline" href="/terminos" target="_blank" rel="noreferrer">Términos</a> y
                <a className="underline ml-1" href="/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a>.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>← Volver</Button>
            <Button variant="primary" onClick={proceed}>
              {mode === "guest" ? "Entendido, seguir como Invitado" : "Entendido, ir a Login"}
            </Button>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <>
      {!asPage && open && (
        <AnimatePresence>
          <Backdrop onClose={onClose} />
        </AnimatePresence>
      )}

      <div
        role={asPage ? undefined : "dialog"}
        aria-modal={asPage ? undefined : true}
        aria-labelledby="access-title"
        className={
          asPage
            ? "min-h-[100dvh] grid place-items-center px-4 py-8 bg-gradient-to-b from-white to-neutral-100 dark:from-neutral-950 dark:to-neutral-900"
            : "fixed inset-0 z-50 grid place-items-center p-4"
        }
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={step}
            ref={startRef}
            tabIndex={-1}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="w-full max-w-4xl"
          >
            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-6 w-6 text-blue-600"/>
                <h2 id="access-title" className="text-2xl md:text-3xl font-bold tracking-tight">
                  {steps.find(s => s.id === step)?.title}
                </h2>
              </div>
              <div className="mt-2">{steps.find(s => s.id === step)?.body}</div>

              {/* Stepper dots */}
              <div className="mt-6 flex items-center justify-center gap-2">
                {[1,2,3].map(idx => (
                  <div key={idx} className={`h-2 w-2 rounded-full ${idx===step?"bg-blue-600":"bg-neutral-300 dark:bg-neutral-700"}`} />
                ))}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

// ------------------ PAGES (stubs) ------------------
function LoginPage(){
  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 bg-white dark:bg-neutral-950">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-4">Iniciar Sesión / Crear Cuenta</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          (Placeholder) Aquí va tu formulario real de Supabase Auth.
        </p>
        <Button className="w-full" variant="primary">Continuar</Button>
      </Card>
    </div>
  );
}

function GuestFlow(){
  const nav = useNavigate();
  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 bg-white dark:bg-neutral-950">
      <Card className="w-full max-w-xl p-6">
        <h1 className="text-xl font-bold mb-2">Modo Invitado</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Subí tu archivo o proyecto para generar tu <b>.ECO</b> portable (hash, timestamp y sello de no-repudio).
          Te lo enviaremos a tu email. No se creará un historial ni un panel.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={() => nav(-1)}>Volver</Button>
          <Button variant="primary">Subir archivo</Button>
        </div>
      </Card>
    </div>
  );
}

function Dashboard(){
  return (
    <div className="min-h-[100dvh] grid place-items-center p-10 bg-white dark:bg-neutral-950">
      <Card className="w-full max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm opacity-70">(Protegido) Solo usuarios autenticados.</p>
      </Card>
    </div>
  );
}

// Guard simple de ejemplo
function ProtectedRoute({ children }: { children: React.ReactNode }){
  const isAuthed = false; // ⟵ conecta con tu estado real de Auth (Supabase)
  const loc = useLocation();
  if (!isAuthed) return <Navigate to="/app/access" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

// ------------------ DEMO APP SHELL ------------------
function App(){
  return (
    <BrowserRouter>
      <Routes>
        {/* CTA unified entry */}
        <Route path="/app/access" element={<AccessGateway asPage />} />
        <Route path="/app/login" element={<LoginPage/>} />
        <Route path="/app/guest" element={<GuestFlow/>} />

        {/* Example protected route */}
        <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />

        {/* Home -> redirect to access for the demo */}
        <Route path="/" element={<Navigate to="/app/access" replace />} />
        <Route path="*" element={<Navigate to="/app/access" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AccessGateway;

// If you want to mount directly for preview when imported as a page:
const mountEl = document.getElementById("root");
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(<App/>);
}
