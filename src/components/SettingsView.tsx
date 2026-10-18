import { useState } from 'react';
import { Sparkles, Trash2, Settings2, Send } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { seedDemoData, removeDemoData } from '@/lib/demo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Modal } from '@/components/PeopleView';

export default function SettingsView() {
  const { profile, updateProfile, refresh } = useLedgerContext();
  const { signOut } = useAuth();
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [botCode, setBotCode] = useState<string | null>(null);
  const [botLinked, setBotLinked] = useState<boolean | null>(null);

  const generateBotCode = async () => {
    setBotCode(null);
    const { data: link } = await supabase.from('bot_links').select('id').limit(1).maybeSingle();
    setBotLinked(!!link);
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const { error } = await supabase.from('bot_link_codes').insert({ code });
    if (error) {
      console.error('bot code failed', error);
      return;
    }
    setBotCode(code);
  };

  if (!profile) return null;

  const runDemo = async (fn: () => Promise<{ error: string | null }>, okMsg: string) => {
    setDemoBusy(true);
    setDemoMsg(null);
    const { error } = await fn();
    setDemoBusy(false);
    setDemoMsg(error ?? okMsg);
    await refresh();
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteErr(null);
    // Data rows cascade with the auth user; storage objects are removed first.
    const { data: files } = await supabase.storage.from('slips').list(profile.id, { limit: 1000 });
    if (files?.length) {
      await supabase.storage.from('slips').remove(files.map((f) => `${profile.id}/${f.name}`));
    }
    const { error } = await supabase.rpc('delete_own_account');
    setDeleteBusy(false);
    if (error) {
      console.error('account deletion failed', error);
      setDeleteErr('Could not delete the account automatically. Ask support to complete the removal.');
      return;
    }
    await signOut();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-sm text-surface-500">Your preferences, demo data, and privacy controls</p>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
          <Settings2 className="h-4 w-4 text-brand-600" /> Preferences
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sname">Display name</label>
            <input
              id="sname"
              className="input"
              defaultValue={profile.display_name}
              onBlur={(e) => void updateProfile({ display_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="scur">Currency</label>
            <select
              id="scur"
              className="input"
              value={profile.currency}
              onChange={(e) => void updateProfile({ currency: e.target.value })}
            >
              {['NGN', 'USD', 'GHS', 'KES', 'ZAR', 'GBP', 'EUR'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-surface-200 px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-surface-900">Proactive overdue nudges</span>
            <span className="block text-xs text-surface-500">Message me when someone crosses the grace window</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand-600"
            checked={profile.nudge_enabled}
            onChange={(e) => void updateProfile({ nudge_enabled: e.target.checked })}
          />
        </label>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
          <Sparkles className="h-4 w-4 text-brand-600" /> Demo data
        </h2>
        <p className="text-sm text-surface-500">
          Load a sample property with tenants that show every status: paid up, in credit from a full-year payment, and overdue. Demo rows are clearly labeled and can be removed at any time.
        </p>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={demoBusy} onClick={() => runDemo(seedDemoData, 'Demo data loaded.')}>
            Load demo data
          </button>
          <button className="btn-secondary" disabled={demoBusy} onClick={() => runDemo(removeDemoData, 'Demo data removed.')}>
            Remove demo data
          </button>
        </div>
        {demoMsg && <p className="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700">{demoMsg}</p>}
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
          <Send className="h-4 w-4 text-brand-600" /> Telegram bot
        </h2>
        <p className="text-sm text-surface-500">
          Connect your Telegram to send slip photos by chat and ask “who owes me?” on the go. Generate a code, then send <code className="rounded bg-surface-100 px-1">/start &lt;code&gt;</code> to the bot in Telegram.
        </p>
        {botLinked && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Telegram is connected to this account.</p>
        )}
        {botCode && (
          <p className="rounded-lg bg-surface-100 px-3 py-2 font-mono text-sm text-surface-900">
            /start {botCode}
            <span className="ml-2 font-sans text-xs text-surface-500">(valid 15 minutes, single use)</span>
          </p>
        )}
        <button className="btn-secondary" onClick={generateBotCode} disabled={demoBusy}>
          {botCode ? 'New connection code' : 'Connect Telegram'}
        </button>
      </section>

      <section className="card space-y-4 border-red-200 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700">
          <Trash2 className="h-4 w-4" /> Danger zone
        </h2>
        <p className="text-sm text-surface-500">
          Permanently delete your account, every record, and all stored slip photos. This cannot be undone.
        </p>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>Delete my account and data</button>
      </section>

      {confirmDelete && (
        <Modal title="Delete everything?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-surface-600">
            This permanently removes your account, people, properties, payments, and slip photos.
          </p>
          {deleteErr && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{deleteErr}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleteBusy}>Cancel</button>
            <button className="btn-danger" onClick={deleteAccount} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
