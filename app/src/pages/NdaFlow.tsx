import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { SupabaseService } from "../lib/supabaseClient";
import { CryptoService } from "../lib/crypto";

interface NdaFormData {
  signerName: string;
  signerEmail: string;
  ndaAccepted: boolean;
  signatureData: string;
}

function NdaFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("documentId");

  const [loading, setLoading] = useState(false);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [formData, setFormData] = useState<NdaFormData>({
    signerName: "",
    signerEmail: "",
    ndaAccepted: false,
    signatureData: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (documentId) {
      loadDocumentInfo();
    }
  }, [documentId]);

  const loadDocumentInfo = async () => {
    if (!documentId) return;

    try {
      const record = await SupabaseService.getEcoRecord(documentId);
      if (record) {
        setDocumentInfo(record);
      } else {
        setError("Documento no encontrado");
      }
    } catch (err) {
      console.error("Error loading document:", err);
      setError("Error al cargar el documento");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const generateSignature = async () => {
    const signaturePayload = {
      documentId,
      signerName: formData.signerName,
      signerEmail: formData.signerEmail,
      timestamp: new Date().toISOString(),
      ndaAccepted: formData.ndaAccepted,
    };

    const signatureString = JSON.stringify(signaturePayload);
    const signature = CryptoService.calculateSHA256FromBase64(
      btoa(unescape(encodeURIComponent(signatureString)))
    );

    return {
      signatureData: signature,
      signaturePayload,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ndaAccepted) {
      setError("Debes aceptar el acuerdo de confidencialidad para continuar");
      return;
    }

    if (!documentId) {
      setError("ID de documento no válido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { signatureData, signaturePayload } = await generateSignature();

      const token = CryptoService.generateNonce();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await SupabaseService.saveNdaSignature({
        document_id: documentId,
        signer_name: formData.signerName,
        signer_email: formData.signerEmail,
        signature_data: JSON.stringify({
          signature: signatureData,
          payload: signaturePayload,
        }),
        nda_accepted: formData.ndaAccepted,
        access_token: token,
        expires_at: expiresAt.toISOString(),
      });

      await SupabaseService.logAccess({
        document_id: documentId,
        user_email: formData.signerEmail,
        action: "accessed",
        metadata: {
          signerName: formData.signerName,
          ndaAccepted: true,
        },
      });

      const ecoMetadata = await CryptoService.createEcoMetadata(
        new File(
          [
            JSON.stringify({
              action: "nda_signature",
              documentId,
              signer: formData.signerName,
              timestamp: new Date().toISOString(),
            }),
          ],
          "nda-signature.json"
        ),
        formData.signerEmail,
        `${documentId}-nda-${Date.now()}`
      );

      await CryptoService.createEcoFile(ecoMetadata);

      setAccessToken(token);
      setStep("success");
    } catch (err: any) {
      console.error("Error submitting NDA:", err);
      setError(err.message || "Error al procesar la firma");
    } finally {
      setLoading(false);
    }
  };

  if (!documentId) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6">
        <Card className="w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            No se proporcionó un ID de documento válido.
          </p>
          <Button variant="primary" onClick={() => navigate("/")} className="mt-4">
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  if (error && !documentInfo) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6">
        <Card className="w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
          <Button variant="primary" onClick={() => navigate("/")} className="mt-4">
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-neutral-950 dark:to-blue-950">
      <Card className="w-full max-w-3xl p-8">
        {step === "info" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Acceso a Documento Protegido
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Este documento requiere firma de acuerdo de confidencialidad
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-700 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Información Importante
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Al acceder a este documento, aceptas mantener confidencial su contenido.
                    Cada acceso queda registrado con trazabilidad forense completa.
                  </p>
                </div>
              </div>
            </div>

            {documentInfo && (
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Información del Documento
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Nombre:</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                      {documentInfo.file_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Tamaño:</span>
                    <span className="text-neutral-900 dark:text-neutral-100">
                      {(documentInfo.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Creado:</span>
                    <span className="text-neutral-900 dark:text-neutral-100">
                      {new Date(documentInfo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => navigate("/")}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => setStep("form")}>
                Continuar al NDA
              </Button>
            </div>
          </>
        )}

        {step === "form" && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Acuerdo de Confidencialidad</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Por favor, completa tus datos y acepta los términos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 max-h-64 overflow-y-auto">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Términos del Acuerdo
                </h3>
                <div className="text-sm text-neutral-700 dark:text-neutral-300 space-y-2">
                  <p>
                    Al firmar este acuerdo, te comprometes a:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Mantener confidencial toda la información contenida en este documento</li>
                    <li>No compartir, copiar o distribuir el contenido sin autorización expresa</li>
                    <li>Usar la información únicamente para los fines autorizados</li>
                    <li>Notificar inmediatamente cualquier divulgación no autorizada</li>
                  </ul>
                  <p className="mt-4 font-medium">
                    Tu acceso será registrado con timestamp criptográfico y generará un certificado
                    .ECO de trazabilidad forense.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="signerName"
                  value={formData.signerName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="signerEmail"
                  value={formData.signerEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <input
                  type="checkbox"
                  name="ndaAccepted"
                  checked={formData.ndaAccepted}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  He leído y acepto los términos del acuerdo de confidencialidad. Entiendo que mi
                  acceso será registrado y que este acuerdo tiene validez legal.
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setStep("info")} disabled={loading}>
                  Volver
                </Button>
                <Button type="submit" variant="primary" disabled={loading || !formData.ndaAccepted}>
                  {loading ? "Procesando..." : "Firmar y Acceder"}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === "success" && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                Firma Registrada Exitosamente
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Tu compromiso de confidencialidad ha sido registrado con trazabilidad forense
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Detalles de tu Firma
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Firmante:</span>
                  <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                    {formData.signerName}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Email:</span>
                  <p className="text-neutral-900 dark:text-neutral-100">{formData.signerEmail}</p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Token de acceso:</span>
                  <p className="font-mono text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-900 p-2 rounded break-all">
                    {accessToken}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    Guarda este token. Lo necesitarás para acceder al documento.
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Válido hasta:</span>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Trazabilidad Forense
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Se ha generado un certificado .ECO de tu firma digital. Este certificado contiene
                timestamp criptográfico, tu identidad verificada y el compromiso de confidencialidad.
                Es tu prueba de no-repudio.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="primary" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default NdaFlow;
