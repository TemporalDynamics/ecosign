import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// --- Type Definitions ---

export type LegalCenterAction = 'certify' | 'sign' | 'workflow' | 'nda' | null;

interface LegalCenterContextType {
  isOpen: boolean;
  open: (action?: LegalCenterAction) => void;
  close: () => void;
  initialAction: LegalCenterAction;
}

// A default, non-functional value for when the hook is used outside the provider
const defaultContextValue: LegalCenterContextType = {
  isOpen: false,
  open: () => console.warn('LegalCenter called outside provider'),
  close: () => {},
  initialAction: null,
};

// --- Context ---

const LegalCenterContext = createContext<LegalCenterContextType | null>(null);

export function useLegalCenter(): LegalCenterContextType {
  const ctx = useContext(LegalCenterContext);
  if (!ctx) {
    return defaultContextValue;
  }
  return ctx;
}

interface LegalCenterProviderProps {
  children: ReactNode;
}

export function LegalCenterProvider({ children }: LegalCenterProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialAction, setInitialAction] = useState<LegalCenterAction>(null);

  const open = (action: LegalCenterAction = null) => {
    setInitialAction(action);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  // useMemo is great here to prevent re-renders of consumers
  const value = useMemo<LegalCenterContextType>(() => ({
    isOpen,
    open,
    close,
    initialAction,
  }), [isOpen, initialAction]);

  return (
    <LegalCenterContext.Provider value={value}>
      {children}
    </LegalCenterContext.Provider>
  );
}
