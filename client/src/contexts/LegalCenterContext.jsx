import React, { createContext, useContext, useState, useMemo } from 'react';

const LegalCenterContext = createContext(null);

export function useLegalCenter() {
  const ctx = useContext(LegalCenterContext);
  if (!ctx) {
    // Return no-op functions instead of throwing error
    // This allows components outside the provider to safely call the hook
    return {
      isOpen: false,
      open: () => console.warn('LegalCenter called outside provider'),
      close: () => {},
      initialAction: null,
    };
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
