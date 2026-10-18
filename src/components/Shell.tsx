import { useState, type ReactNode } from 'react';
import { ReceiptText, LogOut, Users, Building2, LayoutDashboard, CalendarDays, Upload, Settings, Share2, FolderOpen, Archive } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLedger } from '@/hooks/useLedger';

export type Tab = 'dashboard' | 'vault' | 'cases' | 'people' | 'properties' | 'month' | 'upload' | 'export' | 'settings';

interface Props {
  children: ReactNode;
  tab: Tab;
  onTab: (t: Tab) => void;
}

export default function Shell({ children, tab, onTab }: Props) {
  const { user, signOut } = useAuth();
  const { profile } = useLedger();
  const [busy, setBusy] = useState(false);

  const nav: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vault', label: 'Vault', icon: Archive },
    { id: 'cases', label: 'Cases', icon: FolderOpen },
    { id: 'people', label: 'People', icon: Users },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'month', label: 'Month view', icon: CalendarDays },
    { id: 'upload', label: 'Add receipt', icon: Upload },
    { id: 'export', label: 'Export & share', icon: Share2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen bg-surface-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-surface-800 bg-surface-900 px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-glow">
            <ReceiptText className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white">SlipsLedger</span>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                tab === id
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-surface-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-surface-800 pt-4">
          <p className="truncate px-3 text-xs text-surface-500">{user?.email}</p>
          <button
            onClick={handleSignOut}
            disabled={busy}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col md:pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-800 bg-surface-900/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <ReceiptText className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-white">SlipsLedger</span>
          </div>
          <button onClick={handleSignOut} disabled={busy} className="text-surface-300">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-surface-800 bg-surface-900 px-2 py-2 md:hidden">
          {nav.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === id ? 'bg-brand-500/15 text-brand-300' : 'text-surface-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
        {profile && (
          <footer className="px-4 pb-4 text-center text-xs text-surface-400 sm:px-8">
            Signed in{profile.display_name ? ` as ${profile.display_name}` : ''} · data private to your account
          </footer>
        )}
      </div>
    </div>
  );
}
