import React, { createContext, useContext, useMemo } from 'react';
import { User } from '@supabase/supabase-js';

// 1. Mock Data
// =================================================================================

// Create a mock user object that looks like a real Supabase user
const mockUser: User = {
  id: 'guest-user',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Invitado' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

// Create a static list of demo documents (educational PDFs)
const demoDocuments = [
  {
    id: 'demo-doc-1',
    document_name: 'por-que-evidencia-del-lado-del-usuario.pdf',
    notes: 'Principio fundamental: la evidencia debe quedar del lado del usuario, no de la plataforma.',
    certified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    has_legal_timestamp: false,
    has_bitcoin_anchor: false,
    signnow_document_id: null,
    status: 'demo',
    file_url: '/demo-documents/por-que-evidencia-del-lado-del-usuario.pdf',
  },
  {
    id: 'demo-doc-2',
    document_name: 'privacidad-y-cifrado-local.pdf',
    notes: 'Cómo funciona el cifrado en tu ordenador. EcoSign no ve tus documentos: arquitectura, no promesas.',
    certified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    has_legal_timestamp: false,
    has_bitcoin_anchor: false,
    signnow_document_id: null,
    status: 'demo',
    file_url: '/demo-documents/privacidad-y-cifrado-local.pdf',
  },
  {
    id: 'demo-doc-3',
    document_name: 'principios-de-ecosign.pdf',
    notes: 'Los 7 principios que guían cada decisión en EcoSign: ética antes que crecimiento.',
    certified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    has_legal_timestamp: false,
    has_bitcoin_anchor: false,
    signnow_document_id: null,
    status: 'demo',
    file_url: '/demo-documents/principios-de-ecosign.pdf',
  },
];

// 2. Create Context
// =================================================================================

interface GuestContextType {
  user: User | null;
  documents: any[];
  loading: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

// 3. Create Provider
// =================================================================================

export const GuestProvider = ({ children }: { children: React.ReactNode }) => {
  // We use useMemo to ensure the context value object is stable
  const value = useMemo(() => ({
    user: mockUser,
    documents: demoDocuments,
    loading: false, // Data is static, so we are never loading
  }), []);

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
};

// 4. Create Hook
// =================================================================================

export const useGuest = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

/**
 * Helper to detect guest mode from URL (e.g. /inicio?guest=true) and set flag.
 */
export function initGuestFromLocation(locationSearch: string) {
  if (!locationSearch) return false;
  try {
    const params = new URLSearchParams(locationSearch);
    if (params.get('guest') === 'true') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ecosign_guest_mode', 'true');
      }
      return true;
    }
  } catch (err) {
    console.warn('Unable to init guest mode from URL', err);
  }
  return false;
}
