import { useState } from 'react';
import { Building2, Plus, DoorOpen, MapPin, CheckCircle2 } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/months';
import { StatusBadge, Loading, ErrorBox } from '@/components/Dashboard';
import { Modal } from '@/components/PeopleView';
import Avatar from '@/components/Avatar';

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
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-surface-900">Properties</h1>
          <p className="text-sm text-surface-500">Every building, unit, and who occupies it</p>
        </div>
        <button className="btn-primary press animate-fade-up" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-12 text-center text-sm text-surface-500 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 animate-float-y">
            <Building2 className="h-6 w-6 text-brand-600" />
          </div>
          <p>No properties yet. Add your first property, then add its units.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((prop, pi) => {
            const propUnits = units.filter((u) => u.property_id === prop.id);
            const occupied = propUnits.filter((u) => tenancies.some((t) => t.unit_id === u.id)).length;
            const occupancyRate = propUnits.length > 0 ? occupied / propUnits.length : 0;
            return (
              <section
                key={prop.id}
                className="card card-hover group overflow-hidden animate-fade-up"
                style={{ animationDelay: `${pi * 80}ms` }}
              >
                <header className="flex items-center gap-3 border-b border-surface-200 bg-surface-50 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 transition-transform duration-300 group-hover:scale-110">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-surface-900">{prop.name}</h2>
                    {prop.address && (
                      <p className="flex items-center gap-1 truncate text-xs text-surface-500">
                        <MapPin className="h-3 w-3" /> {prop.address}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-2 w-16 overflow-hidden rounded-full bg-surface-200">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-700"
                        style={{ width: `${occupancyRate * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-surface-500">{occupied}/{propUnits.length}</span>
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
                        <li key={u.id} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-brand-50/40 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <DoorOpen className={`h-4 w-4 shrink-0 ${person ? 'text-brand-600' : 'text-surface-300'}`} />
                            <div>
                              <p className="font-medium text-surface-900">{u.label}</p>
                              <p className="text-xs text-surface-500">
                                {person ? person.full_name : 'Vacant / unassigned'}
                                {tenancy && ` · ${formatMoney(tenancy.rent_amount, cur)}/mo`}
                              </p>
                            </div>
                          </div>
                          {person ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={person.full_name} size={28} />
                              <StatusBadge status={person.status} />
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-500">
                              Vacant
                            </span>
                          )}
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
        {err && <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary press" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
