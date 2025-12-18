import React, { Suspense, lazy } from 'react';
import { useLegalCenter } from '../contexts/LegalCenterContext';

// FEATURE FLAG: Switch between legacy and V2
// Set to true to use LegalCenterModalV2 (LEGAL_CENTER_CONSTITUTION.md compliant)
// Set to false to use legacy LegalCenterModal
const USE_LEGAL_CENTER_V2 = true;

const LegalCenterModal = lazy(() => 
  USE_LEGAL_CENTER_V2 
    ? import('./LegalCenterModalV2')
    : import('./LegalCenterModal')
);

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
