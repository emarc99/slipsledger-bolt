import { useState } from 'react';
import { ReceiptText, ShieldCheck, ArrowRight } from 'lucide-react';

interface Props {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
  onSubmit: (email: string, password: string) => Promise<{ error: string | null }>;
}

export default function AuthForm({ mode, onToggleMode, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await onSubmit(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-950 px-4">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-60 w-60 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-5 top-1/3 h-40 w-40 rounded-full bg-info-500/8 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="group flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-glow transition-transform duration-300 hover:scale-110 hover:rotate-3">
            <ReceiptText className="h-6 w-6 text-white transition-transform duration-300 group-hover:-rotate-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">SlipsLedger</h1>
          <p className="text-center text-sm text-surface-400">
            {mode === 'signin'
              ? 'Sign in to your permanent receipt archive'
              : 'Create your account to start filing receipts'}
          </p>
        </div>

        <div className="dark-card p-6 shadow-lift sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label !text-surface-200">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input !border-white/15 !bg-white/5 !text-white placeholder-surface-500 focus:!border-brand-400 focus:!ring-brand-400/30"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label !text-surface-200">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="input !border-white/15 !bg-white/5 !text-white placeholder-surface-500 focus:!border-brand-400 focus:!ring-brand-400/30"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="animate-fade-up rounded-lg bg-error-500/15 px-3 py-2 text-sm text-error-300" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:bg-brand-400 hover:shadow-glow-accent active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {busy ? (
                <span className="relative flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Please wait…
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={onToggleMode}
            className="mt-4 w-full text-center text-sm text-surface-400 transition hover:text-brand-300"
          >
            {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-surface-500">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> Private and only visible to you. Receipt photos are stored encrypted at rest.
        </p>
      </div>
    </div>
  );
}
