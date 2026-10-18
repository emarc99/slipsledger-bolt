import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type {
  Payment, Person, Profile, Property, Tenancy, Unit, Case, CaseDocument,
} from '@/lib/types';
import { computePersonStatus, totalCollected, totalOutstanding } from '@/lib/status';
import { currentMonthKey } from '@/lib/months';

export function useLedger() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [p, ppl, prop, u, t, pay, cs, cd] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('people').select('*').order('full_name'),
      supabase.from('properties').select('*').order('name'),
      supabase.from('units').select('*').order('label'),
      supabase.from('tenancies').select('*').order('start_date'),
      supabase.from('payments').select('*').order('paid_on', { ascending: false }),
      supabase.from('cases').select('*').order('created_at', { ascending: false }),
      supabase.from('case_documents').select('*'),
    ]);
    const errs = [p, ppl, prop, u, t, pay, cs, cd].find((r) => r.error);
    if (errs?.error) {
      console.error('ledger load failed', errs.error);
      setError('Could not load your ledger. Please try again.');
    }
    setProfile(p.data ?? null);
    setPeople(ppl.data ?? []);
    setProperties(prop.data ?? []);
    setUnits(u.data ?? []);
    setTenancies(t.data ?? []);
    setPayments(pay.data ?? []);
    setCases(cs.data ?? []);
    setCaseDocuments(cd.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const personStatuses = useCallback(
    (asOfMonth: string = currentMonthKey()) =>
      people.map((person) => {
        const tenancy = tenancies.find((t) => t.person_id === person.id);
        const unit = tenancy ? units.find((u) => u.id === tenancy.unit_id) : undefined;
        const property = unit ? properties.find((pr) => pr.id === unit.property_id) : undefined;
        const personPayments = payments.filter((p) => p.person_id === person.id);
        return computePersonStatus(person, tenancy, unit, property, personPayments, asOfMonth);
      }),
    [people, tenancies, units, properties, payments],
  );

  const summary = useCallback(
    (asOfMonth: string = currentMonthKey()) => {
      const statuses = personStatuses(asOfMonth);
      return {
        collected: totalCollected(payments, asOfMonth),
        outstanding: totalOutstanding(statuses),
        overdueCount: statuses.filter((s) => s.status === 'overdue').length,
        paidCount: statuses.filter((s) => s.status === 'paid' || s.status === 'overpaid').length,
      };
    },
    [personStatuses, payments],
  );

  const slipUrl = useCallback(
    async (path: string): Promise<string | null> => {
      if (!path) return null;
      const { data, error: err } = await supabase.storage.from('slips').createSignedUrl(path, 300);
      if (err || !data) {
        console.error('signed url failed', err);
        return null;
      }
      return data.signedUrl;
    },
    [],
  );

  const updateProfile = useCallback(
    async (updates: Partial<Pick<Profile, 'display_name' | 'currency' | 'nudge_enabled'>>) => {
      if (!user) return { error: 'Not signed in' };
      const { error: err } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (err) {
        console.error('profile update failed', err);
        return { error: 'Could not save settings. Please try again.' };
      }
      await refresh();
      return { error: null };
    },
    [user, refresh],
  );

  return {
    profile, people, properties, units, tenancies, payments, cases, caseDocuments,
    loading, error, refresh, personStatuses, summary, slipUrl, updateProfile,
  };
}
