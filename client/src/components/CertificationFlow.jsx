import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, FileText, Shield, Upload, AlertTriangle } from 'lucide-react';
import SignatureWorkshop from './SignatureWorkshop';
import { certifyAndDownload } from '../lib/basicCertificationWeb';
import { saveUserDocument } from '../utils/documentStorage';
import { supabase } from '../lib/supabaseClient';

const steps = ['Subir documento', 'Firma legal', 'Certificar', 'Listo'];

const CertificationFlow = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [signResult, setSignResult] = useState(null);
  const [signedFile, setSignedFile] = useState(null);
  const [useLegalTimestamp, setUseLegalTimestamp] = useState(false);
  const [useBitcoinAnchor, setUseBitcoinAnchor] = useState(false);
  const [certResult, setCertResult] = useState(null);
  const [certifying, setCertifying] = useState(false);
  const [error, setError] = useState(null);

  const targetFile = signedFile || uploadedFile;

  const resetFlow = () => {
    setStep(0);
    setUploadedFile(null);
    setSignResult(null);
    setSignedFile(null);
    setUseLegalTimestamp(false);
    setCertResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetFlow();
    onClose?.();
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setUploadedFile(selectedFile);
      setStep(1);
      setError(null);
      setSignResult(null);
      setSignedFile(null);
      setCertResult(null);
    }
  };

  const base64ToFile = (base64, fileName) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  const handleSignSuccess = (result) => {
    setSignResult(result);
    if (result?.signed_pdf_base64) {
      const suggestedName = `${(uploadedFile?.name || 'documento').replace(/\.pdf$/i, '')}-firmado.pdf`;
      const signed = base64ToFile(result.signed_pdf_base64, suggestedName);
      setSignedFile(signed);
    }
    setStep(2);
  };

  const handleCertify = async () => {
    if (!targetFile) {
      setError('Selecciona un documento para certificar.');
      return;
    }

    setCertifying(true);
    setError(null);
    setCertResult(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Certify and download (downloads .ECO file)
      const result = await certifyAndDownload(targetFile, {
        userEmail: user?.email || 'user@verifysign.pro',
        userId: user?.id || 'user-' + Date.now(),
        useLegalTimestamp,
        useBitcoinAnchor
      });

      // If user is authenticated, save to database
      if (user) {
        try {
          console.log('💾 Saving document to cloud storage...');

          // Determine initial status based on download status
          const bitcoinPending = result.downloadStatus === 'pending_bitcoin_anchor';
          const documentStatus = bitcoinPending ? 'pending' : 'signed';
          const overallStatus = bitcoinPending ? 'pending_anchor' : 'certified';

          const savedDoc = await saveUserDocument(targetFile, result.ecoData, {
            signNowDocumentId: signResult?.signnow_document_id || null,
            signNowStatus: signResult?.status || null,
            signedAt: signResult ? new Date().toISOString() : null,
            hasLegalTimestamp: useLegalTimestamp,
            hasBitcoinAnchor: useBitcoinAnchor,
            bitcoinAnchorId: result.bitcoinAnchor?.anchorId || result.anchorRequest?.anchorId || null,
            bitcoinStatus: bitcoinPending ? 'pending' : null,
            overallStatus: overallStatus,
            downloadEnabled: !bitcoinPending,
            // Store .eco buffer for deferred download when Bitcoin pending
            ecoFileData: bitcoinPending ? {
              buffer: Array.from(new Uint8Array(result.ecoxBuffer)),
              fileName: result.fileName,
              createdAt: new Date().toISOString()
            } : null,
            tags: ['certified'],
            notes: null,
            initialStatus: documentStatus
          });
          console.log('✅ Document saved:', savedDoc.id);
          result.savedToCloud = true;
          result.documentId = savedDoc.id;
        } catch (saveError) {
          console.error('⚠️ Failed to save to cloud:', saveError);
          // Don't fail the whole process if cloud save fails
          result.savedToCloud = false;
          result.saveError = saveError.message;
        }
      } else {
        console.log('ℹ️ User not authenticated - skipping cloud save');
        result.savedToCloud = false;
      }

      setCertResult(result);
      setStep(3);
    } catch (err) {
      console.error('Certification error', err);
      setError(err.message || 'No se pudo generar el certificado.');
    } finally {
      setCertifying(false);
    }
  };

  const StepIndicator = useMemo(() => (
    <div className="flex items-center justify-between mb-6">
      {steps.map((label, index) => (
        <div key={label} className="flex-1 flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold text-sm ${
            index === step
              ? 'border-black600 bg-black text-white'
              : index < step
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 text-gray-400'
          }`}>
            {index < step ? '✓' : index + 1}
          </div>
          <div className="ml-3 text-sm font-medium text-gray-700">{label}</div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
          )}
        </div>
      ))}
    </div>
  ), [step]);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900">Certificar documento</h3>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="px-6 py-6">
        {StepIndicator}

        {step === 0 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-8 h-8 text-black" strokeWidth={2.5} />
              </div>
              <p className="text-gray-700 mb-2">Selecciona el documento que deseas firmar y certificar</p>
              <label htmlFor="cert-upload-input" className="cursor-pointer text-black font-semibold">
                Haz clic para seleccionar
                <input id="cert-upload-input" type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-500">Formato recomendado: PDF (para firma legal)</p>
            </div>
          </div>
        )}

        {step === 1 && uploadedFile && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-semibold">🔐 Firma Legal (Recomendado)</p>
              <p className="mb-2">
                Firmá con SignNow para que tu documento tenga <strong>validez legal internacional</strong>:
              </p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li>Audit trail completo (IP, hora, dispositivo)</li>
                <li>Válido en 100+ países (ESIGN, eIDAS, UETA)</li>
                <li>Certificate of Completion tamper-proof</li>
                <li>No-repudiación: el firmante no puede negar la firma</li>
              </ul>
            </div>
            <SignatureWorkshop
              originalFile={uploadedFile}
              documentName={uploadedFile.name}
              documentId={null}
              documentHash={null}
              userId={userIdFallback}
              submitLabel="Firmar con SignNow"
              onSuccess={handleSignSuccess}
              showSkipHint
            />
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>⚠️ Solo Certificación (sin firma legal)</strong>
              </p>
              <p className="text-xs text-yellow-700 mb-3">
                Si saltás este paso, tu documento tendrá un certificado .ECO con sello de tiempo y huella digital,
                pero <strong>NO tendrá validez legal</strong> como documento firmado.
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-yellow-700 hover:text-yellow-900 font-semibold text-sm flex items-center gap-1 underline"
              >
                Continuar solo con certificación (sin firma) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && targetFile && (
          <div className="space-y-5">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Documento listo</p>
              <p className="font-semibold text-gray-900">{targetFile.name}</p>
              <p className="text-xs text-gray-500">{(targetFile.size / 1024).toFixed(2)} KB</p>
              {signedFile && (
                <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Documento firmado con SignNow
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <div>
                <h4 className="text-gray-900 font-semibold flex items-center">
                  ⚖️ Sello de tiempo con validez legal
                </h4>
                <p className="text-sm text-gray-600">Certificado por autoridad de fechas</p>
              </div>
              <button
                onClick={() => setUseLegalTimestamp(!useLegalTimestamp)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useLegalTimestamp ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLegalTimestamp ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
              <div className="flex-1">
                <h4 className="text-gray-900 font-semibold flex items-center">
                  🔗 Verificación pública
                </h4>
                <p className="text-sm text-gray-600">Huella registrada en registro público</p>
                {useBitcoinAnchor && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-100 rounded px-2 py-1">
                    ⏱️ Proceso: 4-24 horas • Recibirás email cuando esté confirmado
                  </div>
                )}
              </div>
              <button
                onClick={() => setUseBitcoinAnchor(!useBitcoinAnchor)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useBitcoinAnchor ? 'bg-amber-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useBitcoinAnchor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={handleCertify}
              disabled={certifying}
              className="w-full py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl font-semibold shadow hover:bg-gray-800  disabled:opacity-50"
            >
              {certifying ? 'Generando certificado...' : 'Generar certificado .ECO'}
            </button>
          </div>
        )}

        {step === 3 && certResult && (
          <div className="space-y-4">
            <div className={`${certResult.downloadStatus === 'pending_bitcoin_anchor' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-4 flex items-start gap-3`}>
              <CheckCircle className={`w-6 h-6 ${certResult.downloadStatus === 'pending_bitcoin_anchor' ? 'text-amber-600' : 'text-emerald-600'}`} />
              <div className="flex-1">
                <h4 className={`${certResult.downloadStatus === 'pending_bitcoin_anchor' ? 'text-amber-800' : 'text-emerald-800'} font-semibold`}>
                  {certResult.downloadStatus === 'pending_bitcoin_anchor'
                    ? 'Certificado en proceso de anclaje Bitcoin'
                    : 'Certificado generado correctamente'}
                </h4>
                <p className={`text-sm ${certResult.downloadStatus === 'pending_bitcoin_anchor' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {certResult.downloadStatus === 'pending_bitcoin_anchor'
                    ? certResult.downloadMessage || 'Tu documento está siendo anclado en la blockchain de Bitcoin. Recibirás un email cuando esté listo para descargar (4-24 horas).'
                    : 'El archivo .ECO se descargó automáticamente.'}
                </p>

                {certResult.savedToCloud && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <p className="font-semibold text-blue-900">☁️ Guardado en la nube</p>
                    <p className="text-blue-700 mt-1">
                      Tu documento firmado está guardado en tu cuenta de VerifySign.
                      {certResult.downloadStatus === 'pending_bitcoin_anchor'
                        ? ' Podrás descargarlo desde tu dashboard cuando el anclaje de Bitcoin esté completo.'
                        : ' Podés accederlo desde tu dashboard en cualquier momento.'}
                    </p>
                  </div>
                )}

                {certResult.savedToCloud === false && certResult.saveError && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    <p className="font-semibold text-yellow-900">⚠️ No se guardó en la nube</p>
                    <p className="text-yellow-700 mt-1">
                      {certResult.saveError}
                    </p>
                  </div>
                )}

                {certResult.anchorRequest && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <p className="font-semibold text-amber-900">🔗 Anclaje en Bitcoin en proceso</p>
                    <p className="text-amber-700 mt-1">
                      El anclaje blockchain puede tardar 4-24 horas. Te notificaremos por email cuando esté confirmado.
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      ID de anclaje: {certResult.anchorRequest.anchorId?.substring(0, 8)}...
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {signResult && (
                <div className="border border-blue-200 rounded-lg p-4">
                  <FileText className="w-6 h-6 text-blue-500 mb-2" />
                  <h5 className="font-semibold text-gray-900">Documento firmado</h5>
                  <p className="text-sm text-gray-600 mb-3">Validez legal otorgada por SignNow.</p>
                  <p className="text-xs text-gray-500">ID SignNow: {signResult.signnow_document_id || '—'}</p>
                </div>
              )}

              <div className="border border-emerald-200 rounded-lg p-4">
                <Shield className="w-6 h-6 text-emerald-500 mb-2" />
                <h5 className="font-semibold text-gray-900">Certificado .ECO</h5>
                <p className="text-sm text-gray-600">Huella: {certResult.hash}</p>
                <p className="text-sm text-gray-600">Sello de tiempo: {new Date(certResult.timestamp).toLocaleString()}</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const userIdFallback = 'user-dashboard-local';

export default CertificationFlow;
