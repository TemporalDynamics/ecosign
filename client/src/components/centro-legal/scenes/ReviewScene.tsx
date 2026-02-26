import React from 'react';
import { CheckCircle2, Shield, FileCheck } from 'lucide-react';
import { PdfEditViewer } from '@/components/pdf/PdfEditViewer';

interface ReviewSceneProps {
  file: File | null;
  filePreviewUrl: string | null;
  forensicEnabled: boolean;
  ndaEnabled: boolean;
  mySignatureEnabled: boolean;
  workflowEnabled: boolean;
  signerCount: number;
  isMobile: boolean;
}

/**
 * SCENE 5: Final Review
 * Responsabilidad: Mostrar resumen de configuración antes de certificar/enviar
 */
export function ReviewScene({
  file,
  filePreviewUrl,
  forensicEnabled,
  ndaEnabled,
  mySignatureEnabled,
  workflowEnabled,
  signerCount,
  isMobile
}: ReviewSceneProps) {
  if (!file) {
    return null;
  }

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
      {/* Panel Izquierdo: Resumen */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileCheck className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Listo para certificar</h3>
          </div>

          <div className="space-y-4">
            {/* Protección */}
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                forensicEnabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {forensicEnabled ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {forensicEnabled ? 'Protección activada' : 'Sin protección'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {forensicEnabled 
                    ? 'Documento respaldado con timestamp legal'
                    : 'El documento no tendrá respaldo probatorio'
                  }
                </p>
              </div>
            </div>

            {/* NDA */}
            {ndaEnabled && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">NDA incluido</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Los destinatarios deberán aceptar el NDA antes de acceder
                  </p>
                </div>
              </div>
            )}

            {/* Mi Firma */}
            {mySignatureEnabled && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Tu firma incluida</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    El documento llevará tu firma visual
                  </p>
                </div>
              </div>
            )}

            {/* Flujo de Firmas */}
            {workflowEnabled && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {signerCount} firmante{signerCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Se enviarán invitaciones por email
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Una vez certificado, el documento y su evidencia quedarán registrados de forma inmutable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Document Preview */}
      <div className="space-y-3">
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden min-h-[480px] bg-gray-50">
          {filePreviewUrl ? (
            <PdfEditViewer
              src={filePreviewUrl}
              locked
              className="w-full h-[600px]"
            />
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <p className="text-gray-500">Cargando preview...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
