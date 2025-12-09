import React, { createContext, useContext, useState, useMemo } from 'react';

const LegalCenterContext = createContext(null);

export function useLegalCenter() {
  const ctx = useContext(LegalCenterContext);
  if (!ctx) {
    throw new Error('useLegalCenter must be used within a LegalCenterProvider');
  }
  return ctx;
}

export function LegalCenterProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialAction, setInitialAction] = useState(null);

  const open = (action = null) => {
    setInitialAction(action);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const value = useMemo(() => ({
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
