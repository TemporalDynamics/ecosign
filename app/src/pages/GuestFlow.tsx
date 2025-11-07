import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";

function GuestFlow() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !email) {
      setError("Por favor, selecciona un archivo y proporciona tu email.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Read file content as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const response = await fetch("/.netlify/functions/mint-eco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          fileContent: base64File, // Send base64 encoded file content
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al generar el certificado .ECO");
      }

      setSuccessMessage(
        `¡Certificado .ECO generado con éxito! Se ha enviado a ${email}. ID: ${data.ecoId}`
      );
      setSelectedFile(null);
      setEmail("");
    } catch (err: any) {
      console.error("Error en GuestFlow handleSubmit:", err);
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 bg-white dark:bg-neutral-950">
      <Card className="w-full max-w-xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Modo Invitado</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6 text-center">
          Subí tu archivo o proyecto para generar tu <b>.ECO</b> portable (hash, timestamp y sello de no-repudio).
          Te lo enviaremos a tu email. No se creará un historial ni un panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Selecciona tu archivo</label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-neutral-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              required
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                Archivo seleccionado: {selectedFile.name} ({ (selectedFile.size / 1024 / 1024).toFixed(2) } MB)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email-input" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Email para recibir el certificado .ECO</label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-neutral-800 dark:text-white"
              placeholder="tu@ejemplo.com"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {successMessage && <p className="text-emerald-500 text-sm text-center">{successMessage}</p>}

          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => navigate(-1)} disabled={loading}>Volver</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Generando .ECO..." : "Generar Certificado .ECO"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default GuestFlow;