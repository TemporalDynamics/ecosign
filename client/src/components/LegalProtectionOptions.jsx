// client/src/components/LegalProtectionOptions.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, FileText, ExternalLink, Zap } from 'lucide-react';
import IntegrationModal from './IntegrationModal';
import { requestMifielIntegration } from '../utils/integrationUtils';
import SignatureWorkshop from './SignatureWorkshop';

const LegalProtectionOptions = ({ documentId, documentHash, userId, originalFile, documentName }) => {
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const handleMifielClick = async () => {
    try {
      const result = await requestMifielIntegration(documentId, 'nom-151', documentHash, userId);
      setModalData(result);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error requesting Mifiel integration:', error);
      toast.error('Error al conectar con el servicio Mifiel. Por favor, intentá de nuevo.');
    }
  };

  const handleSignNowClick = () => {
    setSelectedIntegration((prev) => (prev === 'signnow' ? null : 'signnow'));
  };

  const handleConfirm = async (paymentData) => {
    console.log('Confirming integration:', paymentData);
    toast.success(`Servicio confirmado! La integración con ${paymentData.service} está siendo procesada.`, {
      duration: 5000
    });
  };

  return (
    <div className="mt-8">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Zap className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 font-semibold mb-2">¿Necesitas blindaje legal adicional?</h3>
            <p className="text-gray-700 text-sm mb-4">
              Si necesitas cumplimiento legal avanzado o firmas electrónicas con valor jurídico reforzado,
              tenemos opciones de integración con servicios profesionales.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleMifielClick}
                className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-black300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-green-600 group-hover:text-black" />
                    <span className="font-medium text-gray-900">NOM-151 Certificate</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-500" />
                </div>
                <p className="text-sm text-gray-600 mb-2">Sellado de tiempo con cumplimiento legal mexicano (NOM-151)</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">$29.90</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Mifiel</span>
                </div>
              </button>

              <button
                onClick={handleSignNowClick}
                className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-black300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600 group-hover:text-black" />
                    <span className="font-medium text-gray-900">e-Signature</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-500" />
                </div>
                <p className="text-sm text-gray-600 mb-2">Firmas electrónicas con seguimiento de auditoría</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">$4.99</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">SignNow</span>
                </div>
              </button>
            </div>

            {selectedIntegration === 'signnow' && (
              <div className="mt-6 bg-white border border-blue-100 rounded-xl p-5">
                <h4 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Preparar documento para firma
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Completa los datos del firmante, dibuja tu firma y la incrustaremos en el PDF antes de enviarla a SignNow.
                </p>

                <SignatureWorkshop
                  originalFile={originalFile}
                  documentId={documentId}
                  documentHash={documentHash}
                  userId={userId}
                  documentName={documentName}
                  submitLabel="Solicitar firma con SignNow"
                  showSkipHint
                  onSuccess={(result) => {
                    setModalData(result);
                    setIsModalOpen(true);
                    setSelectedIntegration(null);
                  }}
                  onError={(message) => console.error('Signature workshop error', message)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <IntegrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        integrationData={modalData}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default LegalProtectionOptions;
