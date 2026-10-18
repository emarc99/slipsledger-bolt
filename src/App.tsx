import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import Landing from '@/components/Landing';
import Shell, { type Tab } from '@/components/Shell';
import Dashboard from '@/components/Dashboard';
import PeopleView from '@/components/PeopleView';
import PropertiesView from '@/components/PropertiesView';
import MonthView from '@/components/MonthView';
import UploadView from '@/components/UploadView';
import SettingsView from '@/components/SettingsView';
import ExportView from '@/components/ExportView';
import VaultView from '@/components/VaultView';
import CasesView from '@/components/CasesView';
import { LedgerProvider } from '@/hooks/useLedgerContext';

function AppInner() {
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Landing />;
  }

  return (
    <LedgerProvider>
      <Shell tab={tab} onTab={setTab}>
        {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
        {tab === 'vault' && <VaultView />}
        {tab === 'cases' && <CasesView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'properties' && <PropertiesView />}
        {tab === 'month' && <MonthView />}
        {tab === 'upload' && <UploadView />}
        {tab === 'settings' && <SettingsView />}
        {tab === 'export' && <ExportView />}
      </Shell>
    </LedgerProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
