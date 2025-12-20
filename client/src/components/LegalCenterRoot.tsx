import React, { Suspense } from 'react';
import { useLegalCenter } from '../contexts/LegalCenterContext';
import LegalCenterModal from './LegalCenterModalV2'; // Direct import

function LegalCenterRoot() {
  const { isOpen, close, initialAction } = useLegalCenter();

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <LegalCenterModal isOpen={isOpen} onClose={close} initialAction={initialAction} />
    </Suspense>
  );
}

export default LegalCenterRoot;
