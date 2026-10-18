import { useState } from 'react';
import { Building2, Plus, DoorOpen } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/months';
import { StatusBadge, Loading, ErrorBox } from '@/components/Dashboard';
import { Modal } from '@/components/PeopleView';

export default function PropertiesView() {
  const { properties, units, tenancies, personStatuses, payments, loading, error, refresh, profile } = useLedgerContext();
  const [showAdd, setShowAdd] = useState(false);
  const cur = profile?.currency ?? 'NGN';
  const statuses = personStatuses();

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Properties</h1>
          <p className="text-sm text-surface-500">Every building, unit, and who occupies it</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="card p-12 text-center text-sm text-surface-500">
          No properties yet. Add your first property, then add its units.
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((prop) => {
            const propUnits = units.filter((u) => u.property_id === prop.id);
            return (
              <section key={prop.id} className="card overflow-hidden">
                <header className="flex items-center gap-3 border-b border-surface-200 bg-surface-50 px-4 py-3">
                  <Building2 className="h-4 w-4 text-brand-600" />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-surface-900">{prop.name}</h2>
                    {prop.address && <p className="truncate text-xs text-surface-500">{prop.address}</p>}
                  </div>
                </header>
                {propUnits.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-surface-400">No units yet.</p>
                ) : (
                  <ul className="divide-y divide-surface-100">
                    {propUnits.map((u) => {
                      const tenancy = tenancies.find((t) => t.unit_id === u.id);
                      const person = tenancy ? statuses.find((s) => s.id === tenancy.person_id) : undefined;
                      return (
                        <li key={u.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <DoorOpen className="h-4 w-4 shrink-0 text-surface-400" />
                            <div>
                              <p className="font-medium text-surface-900">{u.label}</p>
                              <p className="text-xs text-surface-500">
                                {person ? person.full_name : 'Vacant / unassigned'}
                                {tenancy && ` · ${formatMoney(tenancy.rent_amount, cur)}/mo`}
                              </p>
                            </div>
                          </div>
                          {person && <StatusBadge status={person.status} />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddPropertyModal
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function AddPropertyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('properties').insert({ name, address });
    setBusy(false);
    if (error) {
      console.error('property insert failed', error);
      setErr('Could not add this property. Please try again.');
      return;
    }
    await onSaved();
  };

  return (
    <Modal title="Add property" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="propname">Name</label>
          <input id="propname" className="input" required placeholder="e.g. Unity Close" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="propaddr">Address (optional)</label>
          <input id="propaddr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
