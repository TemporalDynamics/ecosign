import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Fingerprint,
  ShieldCheck,
  Clock3,
  Stamp,
  Layers,
  FileText
} from 'lucide-react';

const layersConfig = [
  {
    key: 'hash',
    title: 'Hash del documento',
    description: 'Comprueba que el archivo original coincida byte a byte con lo declarado en el certificado.',
    icon: Fingerprint
  },
  {
    key: 'signature',
    title: 'Firma Ed25519',
    description: 'Valida que la firma provenga de VerifySign y no haya sido alterada.',
    icon: ShieldCheck
  },
  {
    key: 'timestamp',
    title: 'Timestamp forense',
    description: 'Corrobora la fecha exacta registrada en el certificado.',
    icon: Clock3
  },
  {
    key: 'legalTimestamp',
    title: 'Sello legal (RFC 3161)',
    description: 'Opcional. Prueba emitida por la Time Stamp Authority.',
    icon: Stamp,
    optional: true
  },
  {
    key: 'format',
    title: 'Formato .ECO',
    description: 'Valida que el contenedor respete la especificación.',
    icon: Layers
  },
  {
    key: 'manifest',
    title: 'Manifiesto',
    description: 'Comprueba que los assets y metadatos estén completos.',
    icon: FileText
  }
];

const statusStyles = {
  full: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    title: 'Verificación completa',
    subtitle: 'Coinciden certificado, firma y archivo original.',
    detail: 'Nivel de evidencia: forense completo.'
  },
  partial: {
    border: 'border-sky-200',
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    icon: <Info className="w-6 h-6 text-sky-600" />,
    title: 'Verificación parcial',
    subtitle: 'El certificado es válido, falta comparar el archivo original.',
    detail: 'Nivel de evidencia: criptográfica, sin archivo.'
  },
  invalid: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-900',
    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
    title: 'Documento no válido',
    subtitle: 'El archivo que cargaste no coincide con el certificado.',
    detail: 'Posibles causas: edición del archivo, descarga incompleta o certificado equivocado.'
  }
};

function determineStatus(result, originalProvided) {
  if (!result) return null;
  if (!result.valid) return statusStyles.invalid;
  if (originalProvided && result.data?.originalFileHash) return statusStyles.full;
  return statusStyles.partial;
}

function layerTone(layerKey, layerState, result) {
  if (!result) return { border: 'border-gray-200', bg: 'bg-white', text: 'text-gray-700', tag: 'Sin datos' };

  if (layerKey === 'hash' && !result.data?.originalFileHash) {
    return {
      border: 'border-sky-200',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      tag: 'Pendiente: falta archivo original'
    };
  }

  if (!layerState) {
    return { border: 'border-gray-200', bg: 'bg-white', text: 'text-gray-700', tag: 'Sin datos' };
  }

  if (layerState.passed) {
    return { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', tag: layerState.message };
  }

  if (layerState.optional && !layerState.passed && !result.data?.legalValidity) {
    return { border: 'border-gray-200', bg: 'bg-white', text: 'text-gray-600', tag: 'No incluido en este certificado' };
  }

  return { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-800', tag: layerState.message };
}

function VerificationSummary({ result, originalProvided = false }) {
  const [showLegalDetails, setShowLegalDetails] = useState(false);
  const status = determineStatus(result, originalProvided);

  const summaryFields = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Documento', value: result.data?.fileName || 'Sin nombre' },
      { label: 'Timestamp', value: result.checks?.timestamp?.message || 'No disponible' },
      { label: 'Firma', value: result.checks?.signature?.message || 'Sin datos' },
      { label: 'Algoritmo', value: result.data?.algorithm || '—' }
    ];
  }, [result]);

  const layers = layersConfig.map((layer) => ({
    ...layer,
    tone: layerTone(layer.key, result?.checks?.[layer.key], result)
  }));

  if (!result) return null;

  return (
    <div className="mt-6 space-y-6">
      {status && (
        <div className={`rounded-2xl border ${status.border} ${status.bg} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <p className={`text-lg font-semibold ${status.text}`}>{status.title}</p>
              <p className="text-sm text-gray-600">{status.subtitle}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 sm:ml-auto">{status.detail}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de la prueba</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {summaryFields.map((field) => (
            <div key={field.label} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{field.label}</p>
              <p className="text-sm text-gray-900">{field.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Capas de verificación</h3>
          <p className="text-xs text-gray-500">Ordenadas de más crítica a estructural</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {layers.map(({ key, title, description, icon: IconComp, tone }) => (
            <div key={key} className={`p-5 rounded-2xl border ${tone.border} ${tone.bg} ${tone.text}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center">
                  <IconComp className="w-5 h-5 text-cyan-600" />
                </div>
                <p className="font-semibold text-gray-900">{title}</p>
              </div>
              <p className="text-sm text-gray-600 mb-2">{description}</p>
              <p className="text-sm font-medium">{tone.tag}</p>
              {key === 'legalTimestamp' && result.data?.legalTimestampReport && (
                <button
                  type="button"
                  onClick={() => setShowLegalDetails((prev) => !prev)}
                  className="mt-3 text-xs font-semibold text-cyan-600"
                >
                  {showLegalDetails ? 'Ocultar detalle TSA' : 'Ver detalle TSA'}
                </button>
              )}
              {key === 'legalTimestamp' && showLegalDetails && result.data?.legalTimestampReport && (
                <pre className="mt-3 text-xs bg-white/80 rounded-lg p-3 border border-cyan-100 text-gray-700 overflow-x-auto">
{JSON.stringify(result.data.legalTimestampReport, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VerificationSummary;
