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

// Create a static list of demo documents
const demoDocuments = [
  {
    id: 'doc-1',
    document_name: 'Acuerdo_Confidencial_Q4.pdf',
    notes: 'Revisión final del acuerdo de partnership.',
    certified_at: new Date('2023-10-28T14:30:00Z').toISOString(),
    updated_at: new Date('2023-10-28T14:30:00Z').toISOString(),
    has_legal_timestamp: true,
    has_bitcoin_anchor: true,
    signnow_document_id: 'fake-signnow-id-1',
    status: 'completado',
  },
  {
    id: 'doc-2',
    document_name: 'Plan_de_Proyecto_Alpha.docx',
    notes: 'Versión inicial del plan de proyecto.',
    certified_at: new Date('2023-11-15T10:00:00Z').toISOString(),
    updated_at: new Date('2023-11-15T10:00:00Z').toISOString(),
    has_legal_timestamp: true,
    has_bitcoin_anchor: false,
    signnow_document_id: null,
    status: 'certificado',
  },
  {
    id: 'doc-3',
    document_name: 'Reporte_Financiero_2023.xlsx',
    notes: 'Reporte trimestral pendiente de firma.',
    certified_at: new Date('2023-11-20T18:00:00Z').toISOString(),
    updated_at: new Date('2023-11-20T18:00:00Z').toISOString(),
    has_legal_timestamp: false,
    has_bitcoin_anchor: false,
    signnow_document_id: null,
    status: 'pendiente',
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
