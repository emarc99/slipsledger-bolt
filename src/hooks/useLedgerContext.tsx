import { createContext, useContext, type ReactNode } from 'react';
import { useLedger } from '@/hooks/useLedger';

type Ledger = ReturnType<typeof useLedger>;

const LedgerContext = createContext<Ledger | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const ledger = useLedger();
  return <LedgerContext.Provider value={ledger}>{children}</LedgerContext.Provider>;
}

export function useLedgerContext(): Ledger {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedgerContext must be used within LedgerProvider');
  return ctx;
}
