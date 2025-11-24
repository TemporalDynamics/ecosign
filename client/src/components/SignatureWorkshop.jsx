import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { File, Mail, PenLine, Trash2, User } from 'lucide-react';
import { requestSignNowIntegration } from '../utils/integrationUtils';

const SignatureWorkshop = ({
  originalFile,
  documentId = null,
  documentHash = null,
  userId = null,
  documentName = '',
  defaultSignerName = '',
  defaultSignerEmail = '',
  submitLabel = 'Solicitar firma con SignNow',
  onSuccess,
  onError,
  extraContent,
  showSkipHint = false
}) => {
  const [signNowForm, setSignNowForm] = useState({
    signerName: defaultSignerName,
    signerEmail: defaultSignerEmail,
    documentTitle: documentName || ''
  });
  const [signNowLoading, setSignNowLoading] = useState(false);
  const [signNowError, setSignNowError] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [hasSavedSignature, setHasSavedSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureBox, setSignatureBox] = useState({ x: 40, y: 40, width: 220, height: 90 });
  const [signaturePage, setSignaturePage] = useState(1);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);
  const [resizing, setResizing] = useState(false);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const dragStartRef = useRef(null);

  useEffect(() => {
    if (documentName) {
      setSignNowForm((prev) => ({ ...prev, documentTitle: documentName }));
    }
  }, [documentName]);

  useEffect(() => {
    // Cargar firma guardada si está disponible
    const storedSignature = localStorage.getItem('verifysign_signature');
    const signatureExpiry = localStorage.getItem('verifysign_signature_expiry');

    // Verificar si la firma ha expirado (por ejemplo, después de 30 días)
    if (storedSignature && signatureExpiry) {
      const now = new Date().getTime();
      const expiryTime = parseInt(signatureExpiry, 10);

      if (now < expiryTime) {
        setSignatureImage(storedSignature);
        setHasSavedSignature(true);
      } else {
        // Limpiar firma expirada
        localStorage.removeItem('verifysign_signature');
        localStorage.removeItem('verifysign_signature_expiry');
      }
    }
  }, []);

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      setDocumentPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setDocumentPreviewUrl(null);
    return undefined;
  }, [originalFile]);

  useEffect(() => () => {
    window.removeEventListener('mousemove', handleSignatureMove);
    window.removeEventListener('touchmove', handleSignatureMove);
    window.removeEventListener('mouseup', handleSignaturePointerUp);
    window.removeEventListener('touchend', handleSignaturePointerUp);
  }, []);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    return ctx;
  };

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleCanvasStart = (event) => {
    event.preventDefault();
    const ctx = getCanvasContext();
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const handleCanvasMove = (event) => {
    if (!isDrawing) return;
    event.preventDefault();
    const ctx = getCanvasContext();
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleCanvasEnd = () => {
    setIsDrawing(false);
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasInk = pixels.some((value, index) => (index % 4 === 3 ? value > 0 : false));
    if (!hasInk) {
      toast.error('Dibuja tu firma antes de guardarla.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');

    // Establecer fecha de expiración (30 días desde ahora)
    const now = new Date().getTime();
    const expiryTime = now + (30 * 24 * 60 * 60 * 1000); // 30 días en milisegundos

    localStorage.setItem('verifysign_signature', dataUrl);
    localStorage.setItem('verifysign_signature_expiry', expiryTime.toString());
    setSignatureImage(dataUrl);
    setHasSavedSignature(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearSignature = () => {
    clearCanvas();
    setSignatureImage(null);
    setHasSavedSignature(false);
    localStorage.removeItem('verifysign_signature');
    localStorage.removeItem('verifysign_signature_expiry');
  };

  const handleSignaturePointerDown = (event, resize = false) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      startLeft: signatureBox.x,
      startTop: signatureBox.y,
      startWidth: signatureBox.width,
      startHeight: signatureBox.height,
      rect
    };
    setResizing(resize);
    window.addEventListener('mousemove', handleSignatureMove, { passive: false });
    window.addEventListener('touchmove', handleSignatureMove, { passive: false });
    window.addEventListener('mouseup', handleSignaturePointerUp);
    window.addEventListener('touchend', handleSignaturePointerUp);
  };

  const handleSignatureMove = (event) => {
    if (!dragStartRef.current) return;
    event.preventDefault();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;
    const rect = dragStartRef.current.rect;

    if (resizing) {
      const newWidth = Math.min(Math.max(dragStartRef.current.startWidth + deltaX, 60), rect.width);
      const newHeight = Math.min(Math.max(dragStartRef.current.startHeight + deltaY, 30), rect.height);
      setSignatureBox((prev) => ({ ...prev, width: newWidth, height: newHeight }));
    } else {
      const newX = Math.min(Math.max(dragStartRef.current.startLeft + deltaX, 0), rect.width - signatureBox.width);
      const newY = Math.min(Math.max(dragStartRef.current.startTop + deltaY, 0), rect.height - signatureBox.height);
      setSignatureBox((prev) => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handleSignaturePointerUp = () => {
    dragStartRef.current = null;
    setResizing(false);
    window.removeEventListener('mousemove', handleSignatureMove);
    window.removeEventListener('touchmove', handleSignatureMove);
    window.removeEventListener('mouseup', handleSignaturePointerUp);
    window.removeEventListener('touchend', handleSignaturePointerUp);
  };

  const computeSignaturePlacement = () => {
    if (!previewRef.current) return null;
    const rect = previewRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      page: Math.max(1, Number(signaturePage) || 1),
      xPercent: signatureBox.x / rect.width,
      yPercent: signatureBox.y / rect.height,
      widthPercent: signatureBox.width / rect.width,
      heightPercent: signatureBox.height / rect.height
    };
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo original'));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!originalFile) {
      setSignNowError('Adjunta el archivo original para continuar.');
      return;
    }

    if (!(originalFile.type || '').includes('pdf')) {
      setSignNowError('La firma legal solo está disponible para archivos PDF.');
      return;
    }

    if (!signNowForm.signerEmail.trim()) {
      setSignNowError('El email del firmante es obligatorio.');
      return;
    }

    if (!signatureImage) {
      setSignNowError('Primero debes guardar tu firma (paso 1).');
      return;
    }

    const placement = computeSignaturePlacement();
    if (!placement) {
      setSignNowError('No pudimos calcular la posición de la firma, vuelve a intentar.');
      return;
    }

    setSignNowLoading(true);
    setSignNowError(null);

    try {
      const base64File = await readFileAsBase64(originalFile);
      const result = await requestSignNowIntegration(
        documentId,
        'esignature',
        documentHash,
        userId,
        [
          {
            email: signNowForm.signerEmail.trim(),
            name: signNowForm.signerName.trim() || undefined,
            role: 'Signer 1'
          }
        ],
        {
          documentFile: {
            name: originalFile.name,
            type: originalFile.type || 'application/pdf',
            size: originalFile.size,
            base64: base64File
          },
          documentName: signNowForm.documentTitle || originalFile.name,
          requireNdaEmbed: true,
          signature: {
            image: signatureImage,
            placement
          },
          metadata: {
            source: 'signature-workshop'
          }
        }
      );

      onSuccess?.(result);
      return result;
    } catch (error) {
      console.error('SignNow error:', error);

      // Check if it's the "not configured" error
      const errorMessage = error.message || 'Error conectando con SignNow';

      if (errorMessage.includes('SignNow integration is required') ||
          errorMessage.includes('SIGNNOW_NOT_CONFIGURED')) {
        setSignNowError(
          '⚠️ La firma legal con SignNow no está configurada en este servidor. ' +
          'Por favor contacta al administrador para habilitar firmas con validez legal internacional.'
        );
      } else {
        setSignNowError(errorMessage);
      }

      onError?.(errorMessage);
      return null;
    } finally {
      setSignNowLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {extraContent}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">1. Firma autógrafa</span>
            {signatureImage && (
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-xs text-red-500 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
          {!hasSavedSignature && (
            <div>
              <div
                className="border border-dashed border-gray-300 rounded-lg overflow-hidden"
                onMouseDown={handleCanvasStart}
                onMouseMove={handleCanvasMove}
                onMouseUp={handleCanvasEnd}
                onMouseLeave={handleCanvasEnd}
                onTouchStart={handleCanvasStart}
                onTouchMove={handleCanvasMove}
                onTouchEnd={handleCanvasEnd}
              >
                <canvas ref={canvasRef} width={360} height={160} className="w-full h-40 bg-white" />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <PenLine className="w-4 h-4" /> Guardar firma
                </button>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Borrar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">La firma se guarda localmente para reutilizarla.</p>
            </div>
          )}

          {hasSavedSignature && signatureImage && (
            <div className="text-center">
              <img src={signatureImage} alt="Tu firma" className="mx-auto max-h-24" />
              <p className="text-xs text-gray-500 mt-2">Puedes redibujarla cuando quieras.</p>
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">2. Posición en el documento</span>
            <label className="flex items-center gap-2 text-xs">
              <span>Página</span>
              <input
                type="number"
                min="1"
                value={signaturePage}
                onChange={(e) => setSignaturePage(e.target.value)}
                className="w-16 border border-gray-300 rounded px-2 py-1"
              />
            </label>
          </div>
          <div
            ref={previewRef}
            className="relative w-full h-64 border border-dashed border-blue-200 rounded-lg overflow-hidden bg-slate-50"
          >
            {documentPreviewUrl ? (
              <object data={documentPreviewUrl} type="application/pdf" className="w-full h-full">
                <p className="text-center text-xs text-gray-500 mt-8 px-2">
                  Tu navegador no puede previsualizar el PDF, pero igual enviaremos la posición de la firma.
                </p>
              </object>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-500 px-4 text-center">
                Adjunta el PDF original para poder posicionar la firma.
              </div>
            )}

            {signatureImage && documentPreviewUrl && (
              <div
                className="absolute border-2 border-blue-500 bg-white/90 rounded-lg cursor-move"
                style={{
                  left: signatureBox.x,
                  top: signatureBox.y,
                  width: signatureBox.width,
                  height: signatureBox.height
                }}
                onMouseDown={(e) => handleSignaturePointerDown(e, false)}
                onTouchStart={(e) => handleSignaturePointerDown(e, false)}
              >
                <img src={signatureImage} alt="Firma" className="w-full h-full object-contain" />
                <div className="absolute bottom-0 right-0 text-[10px] bg-blue-600 text-white px-2 py-1 rounded-tl">
                  Arrastra para mover
                </div>
                <div
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full cursor-se-resize flex items-center justify-center"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleSignaturePointerDown(e, true);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleSignaturePointerDown(e, true);
                  }}
                >
                  ↔
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Arrastra la firma sobre el documento y ajusta el tamaño con la esquina inferior derecha.
          </p>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1 uppercase">
          <File className="w-3 h-3" />
          Título del documento
        </label>
        <input
          type="text"
          value={signNowForm.documentTitle}
          onChange={(e) => setSignNowForm((prev) => ({ ...prev, documentTitle: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black500"
          placeholder="Contrato NDA.pdf"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1 uppercase">
            <User className="w-3 h-3" />
            Nombre del firmante
          </label>
          <input
            type="text"
            value={signNowForm.signerName}
            onChange={(e) => setSignNowForm((prev) => ({ ...prev, signerName: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black500"
            placeholder="María López"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1 uppercase">
            <Mail className="w-3 h-3" />
            Email del firmante *
          </label>
          <input
            type="email"
            required
            value={signNowForm.signerEmail}
            onChange={(e) => setSignNowForm((prev) => ({ ...prev, signerEmail: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black500"
            placeholder="firma@empresa.com"
          />
        </div>
      </div>

      {signNowError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {signNowError}
        </div>
      )}

      {showSkipHint && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Puedes saltar este paso, pero recomendamos firmar antes de certificar para máxima validez legal.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={signNowLoading}
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium shadow hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60"
        >
          {signNowLoading ? 'Preparando...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default SignatureWorkshop;
