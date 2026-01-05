import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

type VerificationResult = {
  valid: boolean;
  fileName?: string;
  hash?: string;
  timestamp?: string;
  signature?: { algorithm?: string; valid?: boolean };
  signatureValid?: boolean;
  anchors?: {
    polygon?: { status?: string } | null;
    bitcoin?: { status?: string } | null;
  } | null;
  errors?: string[];
  warnings?: string[];
};

const statusStyles: Record<
  'valid' | 'invalid',
  {
    border: string;
    bg: string;
    text: string;
    icon: JSX.Element;
    title: string;
    subtitle: string;
    detail: string;
  }
> = {
  valid: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    title: 'Certificado consistente',
    subtitle: 'La evidencia criptográfica es consistente.',
    detail: 'El certificado no ha sido alterado.'
  },
  invalid: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-900',
    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
    title: 'Certificado inconsistente',
    subtitle: 'La evidencia criptográfica no es consistente.',
    detail: 'El certificado o el archivo no coinciden.'
  }
};

function determineStatus(result: VerificationResult | null, originalProvided: boolean) {
  if (!result) return null;
  // Lógica binaria: Si es válido → Verde, Si no es válido → Rojo
  // El archivo original es información adicional, no afecta la validez del certificado
  if (!result.valid) return statusStyles.invalid;
  return statusStyles.valid;
}

const buildEvidenceItems = (result: VerificationResult): string[] => {
  const items: string[] = [];

  if (result.valid) {
    items.push('Integridad criptográfica verificada.');
  }

  if (result.signatureValid || result.signature?.valid) {
    items.push('Existe una firma registrada en el certificado.');
  }

  if (result.timestamp) {
    items.push('Existe un sello de tiempo en el certificado.');
  }

  if (result.anchors?.polygon?.status === 'confirmed') {
    items.push('Existe un anclaje público confirmado (Polygon).');
  }

  if (result.anchors?.bitcoin?.status === 'confirmed') {
    items.push('Existe un anclaje público confirmado (Bitcoin).');
  }

  return items;
};

interface VerificationSummaryProps {
  result: VerificationResult | null;
  originalProvided?: boolean;
}

function VerificationSummary({ result, originalProvided = false }: VerificationSummaryProps) {
  const status = determineStatus(result, originalProvided);

  const summaryFields = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Documento', value: result.fileName || 'Sin nombre' },
      { label: 'Hash', value: result.hash || 'No disponible' },
      { label: 'Timestamp', value: result.timestamp ? new Date(result.timestamp).toLocaleString() : 'No disponible' },
      { label: 'Firma', value: (result.signatureValid || result.signature?.valid) ? 'Registrada' : 'No disponible' }
    ];
  }, [result]);
  const evidenceItems = result ? buildEvidenceItems(result) : [];

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
              <p className="text-sm text-gray-900 break-words">{field.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidencia verificada</h3>
        <div className="space-y-2">
          {(evidenceItems.length > 0
            ? evidenceItems
            : ['No hay evidencia verificable en este certificado.']
          ).map((item) => (
            <p key={item} className="text-sm text-gray-700">
              • {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VerificationSummary;
