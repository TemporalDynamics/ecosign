import React, { Suspense, lazy } from 'react';
import { useLegalCenter } from '../contexts/LegalCenterContext';

const LegalCenterModal = lazy(() => import('./LegalCenterModal'));

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
