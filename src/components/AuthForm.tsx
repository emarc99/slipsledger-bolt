import { useState } from 'react';
import { ReceiptText, ShieldCheck } from 'lucide-react';

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
    <div className="grain flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-glow">
            <ReceiptText className="h-6 w-6 text-white" />
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
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
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
          <ShieldCheck className="h-3.5 w-3.5" /> Private and only visible to you. Receipt photos are stored encrypted at rest.
        </p>
      </div>
    </div>
  );
}
