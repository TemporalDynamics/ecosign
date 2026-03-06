import { useEffect, useMemo } from 'react';
import LegalCenterModalV2 from '../components/LegalCenterModalV2';

/**
 * Visual E2E harness for rotated canvas regressions.
 * Public route only for local/CI test automation.
 */
export default function CanvasVisualHarnessPage() {
  const initialAction = useMemo(() => {
    if (typeof window === 'undefined') return 'certify' as const;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'sign' || action === 'workflow' || action === 'nda' || action === 'certify') return action;
    return 'certify' as const;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('legal_center_guide', JSON.stringify({ disabled: true, never_show_welcome: true }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <LegalCenterModalV2 isOpen onClose={() => {}} initialAction={initialAction} />
    </div>
  );
}
