/**
 * MÓDULO MI FIRMA — MODAL
 * 
 * Modal flotante sobre el preview del documento
 * 
 * Reglas:
 * R1: Modal flotante (NO altera layout del Centro Legal)
 * R2: NO firma en blockchain (solo prepara firma visual)
 * R3: NO implica envío
 * 
 * Tabs:
 * - Dibujar (canvas)
 * - Subir (file upload)
 * - Escribir (text input)
 */

import React, { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { useSignatureCanvas } from '@/hooks/useSignatureCanvas';
import { SIGNATURE_COPY } from './signature.copy';
import type { SignatureMode, SignatureData } from './signature.rules';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: SignatureData) => void;
  existingSignature?: SignatureData | null;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSignature,
}) => {
  const [activeTab, setActiveTab] = useState<SignatureMode>('canvas');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas({
    lineWidth: 2.4,
    strokeStyle: '#111827',
  });

  useEffect(() => {
    if (isOpen && existingSignature) {
      // Load existing signature if available
      setUploadedSignature(existingSignature.imageUrl);
    }
  }, [isOpen, existingSignature]);

  const handleSave = () => {
    let imageUrl = '';

    if (activeTab === 'canvas') {
      imageUrl = getSignatureData() ?? '';
    } else if (activeTab === 'upload' && uploadedSignature) {
      imageUrl = uploadedSignature;
    } else if (activeTab === 'type' && typedSignature) {
      // Convert text to canvas image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '32px cursive';
        ctx.fillText(typedSignature, 10, 50);
        imageUrl = canvas.toDataURL();
      }
    }

    if (imageUrl) {
      onSave({
        imageUrl,
        coordinates: { x: 100, y: 100 }, // Default position
      });
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedSignature(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] animate-fadeIn p-6">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-fadeScaleIn">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {SIGNATURE_COPY.modalTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'canvas'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {SIGNATURE_COPY.tabDraw}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'upload'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {SIGNATURE_COPY.tabUpload}
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'type'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {SIGNATURE_COPY.tabType}
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {activeTab === 'canvas' && (
            <div className="space-y-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  {...handlers}
                  className="border-2 border-gray-300 rounded-lg w-full cursor-pointer"
                />
                {!hasSignature && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-300">
                    <Pencil className="h-8 w-8" />
                  </div>
                )}
              </div>
              <button
                onClick={clearCanvas}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {SIGNATURE_COPY.clearButton}
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-gray-900 file:text-white
                  hover:file:bg-gray-800"
              />
              {uploadedSignature && (
                <img
                  src={uploadedSignature}
                  alt="Signature preview"
                  className="max-h-32 border rounded-lg"
                />
              )}
            </div>
          )}

          {activeTab === 'type' && (
            <input
              type="text"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder={SIGNATURE_COPY.typePlaceholder}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-2xl font-cursive focus:outline-none focus:border-gray-900"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {SIGNATURE_COPY.cancelButton}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            {SIGNATURE_COPY.saveButton}
          </button>
        </div>
      </div>
    </div>
  );
};
