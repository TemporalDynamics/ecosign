import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { supabase } from "../lib/supabase";
import { SupabaseService, type EcoRecord } from "../lib/supabaseClient";
import { CryptoService } from "../lib/crypto";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ecoRecords, setEcoRecords] = useState<EcoRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    anchored: 0,
    verified: 0,
  });

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user?.email) {
        const records = await SupabaseService.getEcoRecordsByEmail(user.email);
        setEcoRecords(records);

        const statsData = {
          total: records.length,
          pending: records.filter((r: EcoRecord) => r.status === "pending").length,
          anchored: records.filter((r: EcoRecord) => r.status === "anchored").length,
          verified: records.filter((r: EcoRecord) => r.status === "verified").length,
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDownloadEco = (record: EcoRecord) => {
    if (record.eco_metadata) {
      CryptoService.downloadEcoFile(
        record.eco_metadata,
        record.file_name.replace(/\.[^/.]+$/, "")
      );

      SupabaseService.logAccess({
        document_id: record.document_id,
        user_email: user?.email || "",
        action: "downloaded",
      });
    }
  };

  const handleViewDetails = (documentId: string) => {
    navigate(`/document/${documentId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-slate-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-neutral-950 dark:to-blue-950 p-6">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Dashboard VerifySign
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {user?.email || "Usuario"}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" disabled={loading}>
            {loading ? "Cerrando..." : "Cerrar Sesión"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white dark:bg-neutral-800">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats.total}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Documentos</div>
          </Card>

          <Card className="p-6 bg-white dark:bg-neutral-800">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
              {stats.pending}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Pendientes</div>
          </Card>

          <Card className="p-6 bg-white dark:bg-neutral-800">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {stats.anchored}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Anclados</div>
          </Card>

          <Card className="p-6 bg-white dark:bg-neutral-800">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {stats.verified}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Verificados</div>
          </Card>
        </div>

        <div className="flex gap-4 mb-6">
          <Button variant="primary" onClick={() => navigate("/guest")}>
            + Generar nuevo .ECO
          </Button>
          <Button variant="outline" onClick={() => navigate("/verify")}>
            Verificar Documento
          </Button>
        </div>

        <Card className="p-6 bg-white dark:bg-neutral-800">
          <h2 className="text-xl font-semibold mb-4">Mis Certificados .ECO</h2>

          {ecoRecords.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                No tienes documentos certificados todavía
              </p>
              <Button variant="primary" onClick={() => navigate("/guest")}>
                Generar tu primer .ECO
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ecoRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {record.file_name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            record.status === "anchored"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : record.status === "verified"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Hash:</span>
                          <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                            {record.sha256_hash.substring(0, 16)}...
                          </code>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span>Tamaño: {(record.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          <span>
                            Creado: {new Date(record.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {record.blockchain_tx_id && (
                          <div className="flex items-center gap-2 text-xs">
                            <span>TX:</span>
                            <code className="font-mono bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-800 dark:text-green-300">
                              {record.blockchain_tx_id.substring(0, 24)}...
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadEco(record)}
                        title="Descargar .ECO"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(record.document_id)}
                        title="Ver detalles"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Tu Soberanía Digital
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Cada certificado .ECO es tu prueba independiente. No necesitas confiar en VerifySign
            para validar tus documentos. La verificación es criptográfica y descentralizada.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;