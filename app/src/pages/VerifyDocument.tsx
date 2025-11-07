import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { CryptoService, type EcoFile } from "../lib/crypto";
import { SupabaseService } from "../lib/supabaseClient";

interface VerificationResult {
  isValid: boolean;
  ecoFile: EcoFile;
  originalFile?: File;
  fileHashMatch?: boolean;
  dbRecord?: any;
  message: string;
}

function VerifyDocument() {
  const navigate = useNavigate();
  const [ecoFile, setEcoFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const handleEcoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setEcoFile(event.target.files[0]);
      setVerificationResult(null);
    }
  };

  const handleOriginalFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setOriginalFile(event.target.files[0]);
      setVerificationResult(null);
    }
  };

  const handleVerify = async () => {
    if (!ecoFile) {
      alert("Por favor, selecciona un archivo .ECO para verificar.");
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const ecoContent = await ecoFile.text();
      const parsedEco: EcoFile = JSON.parse(ecoContent);

      const isEcoValid = CryptoService.verifyEcoFile(parsedEco);

      if (!isEcoValid) {
        setVerificationResult({
          isValid: false,
          ecoFile: parsedEco,
          message: "El archivo .ECO ha sido alterado o es inválido. La prueba criptográfica no coincide.",
        });
        return;
      }

      let fileHashMatch = undefined;
      if (originalFile) {
        fileHashMatch = await CryptoService.verifyFileAgainstEco(originalFile, parsedEco);
      }

      const dbRecord = await SupabaseService.getEcoRecord(parsedEco.metadata.documentId);

      await SupabaseService.logAccess({
        document_id: parsedEco.metadata.documentId,
        user_email: parsedEco.metadata.userEmail,
        action: "verified",
        metadata: {
          verifiedWith: originalFile ? "original_file" : "eco_only",
          fileHashMatch,
        },
      });

      setVerificationResult({
        isValid: isEcoValid,
        ecoFile: parsedEco,
        originalFile: originalFile || undefined,
        fileHashMatch,
        dbRecord,
        message: isEcoValid
          ? "El certificado .ECO es válido y auténtico."
          : "El certificado .ECO no es válido.",
      });
    } catch (error) {
      console.error("Error al verificar:", error);
      setVerificationResult({
        isValid: false,
        ecoFile: {} as EcoFile,
        message: "Error al procesar el archivo .ECO. Asegúrate de que sea un archivo válido.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-950 dark:to-neutral-900">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Verificar Autenticidad
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Verifica la integridad y autenticidad de documentos certificados con .ECO
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ¿Qué es un archivo .ECO?
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Un archivo .ECO es un certificado de autenticidad digital que contiene el hash SHA-256
              del documento original, timestamp criptográfico, y prueba de no-repudio. Es tu evidencia
              forense independiente.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
              1. Selecciona el archivo .ECO (Requerido)
            </label>
            <input
              type="file"
              accept=".eco.json,.json"
              onChange={handleEcoFileChange}
              className="block w-full text-sm text-neutral-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-cyan-50 file:text-cyan-700
                hover:file:bg-cyan-100
                dark:file:bg-cyan-900/30 dark:file:text-cyan-300"
            />
            {ecoFile && (
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Archivo seleccionado: {ecoFile.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
              2. Selecciona el archivo original (Opcional)
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-2">
              Para verificación completa, sube el documento original para comparar hashes.
            </p>
            <input
              type="file"
              onChange={handleOriginalFileChange}
              className="block w-full text-sm text-neutral-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-slate-50 file:text-slate-700
                hover:file:bg-slate-100
                dark:file:bg-slate-800 dark:file:text-slate-300"
            />
            {originalFile && (
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Archivo seleccionado: {originalFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" onClick={() => navigate(-1)} disabled={loading}>
              Volver
            </Button>
            <Button variant="primary" onClick={handleVerify} disabled={loading || !ecoFile}>
              {loading ? "Verificando..." : "Verificar Autenticidad"}
            </Button>
          </div>
        </div>

        {verificationResult && (
          <div className="mt-8 space-y-4">
            <div
              className={`p-6 rounded-lg border-2 ${
                verificationResult.isValid
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"
                  : "bg-red-50 dark:bg-red-900/20 border-red-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    verificationResult.isValid ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {verificationResult.isValid ? (
                    <svg
                      className="w-7 h-7 text-white"
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
                  ) : (
                    <svg
                      className="w-7 h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-lg font-bold mb-1 ${
                      verificationResult.isValid
                        ? "text-emerald-900 dark:text-emerald-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {verificationResult.isValid ? "Certificado Válido" : "Certificado Inválido"}
                  </h3>
                  <p
                    className={`text-sm ${
                      verificationResult.isValid
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {verificationResult.message}
                  </p>
                </div>
              </div>
            </div>

            {verificationResult.isValid && verificationResult.ecoFile.metadata && (
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Detalles del Certificado
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Documento ID:</span>
                    <p className="font-mono text-xs text-neutral-900 dark:text-neutral-100 break-all">
                      {verificationResult.ecoFile.metadata.documentId}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Nombre del archivo:</span>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {verificationResult.ecoFile.metadata.fileName}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Hash SHA-256:</span>
                    <p className="font-mono text-xs text-neutral-900 dark:text-neutral-100 break-all">
                      {verificationResult.ecoFile.metadata.sha256Hash}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Timestamp:</span>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {new Date(verificationResult.ecoFile.metadata.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Email del propietario:</span>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {verificationResult.ecoFile.metadata.userEmail}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Tamaño del archivo:</span>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {(verificationResult.ecoFile.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {verificationResult.fileHashMatch !== undefined && (
                  <div
                    className={`p-4 rounded-md ${
                      verificationResult.fileHashMatch
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        verificationResult.fileHashMatch
                          ? "text-emerald-800 dark:text-emerald-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {verificationResult.fileHashMatch
                        ? "✓ El hash del archivo original coincide perfectamente"
                        : "✗ El archivo original NO coincide con el certificado"}
                    </p>
                  </div>
                )}

                {verificationResult.dbRecord && (
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      Anclaje Blockchain
                    </h5>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400">Estado:</span>
                        <span
                          className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            verificationResult.dbRecord.status === "anchored"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {verificationResult.dbRecord.status}
                        </span>
                      </div>
                      {verificationResult.dbRecord.blockchain_tx_id && (
                        <div>
                          <span className="text-neutral-500 dark:text-neutral-400">TX ID:</span>
                          <p className="font-mono text-xs text-neutral-900 dark:text-neutral-100">
                            {verificationResult.dbRecord.blockchain_tx_id}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Tu Soberanía Digital
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Este certificado .ECO es tu prueba independiente. No dependes de VerifySign ni de
                ninguna entidad para validar su autenticidad. El hash criptográfico y el timestamp
                son verificables por cualquier persona con conocimientos técnicos.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default VerifyDocument;
