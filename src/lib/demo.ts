import { supabase } from './supabase';

/**
 * Seeds a small, clearly-labeled demo dataset for the signed-in account:
 * one property, three units, three people with tenancies, and payments that
 * demonstrate every status (paid up, overpaid via multi-month, overdue).
 * Demo rows are marked in their note fields so they're easy to spot.
 */
export async function seedDemoData(): Promise<{ error: string | null }> {
  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .insert({ name: 'Demo — Unity Close', address: '12 Unity Close, Ikeja' })
    .select('id')
    .maybeSingle();
  if (propErr || !prop) return fail(propErr, 'property');

  const unitRows = await supabase
    .from('units')
    .insert([
      { property_id: prop.id, label: 'Flat A' },
      { property_id: prop.id, label: 'Flat B' },
      { property_id: prop.id, label: 'Shop 1' },
    ])
    .select('id, label');
  if (unitRows.error || !unitRows.data) {
    await cleanup(prop.id);
    return fail(unitRows.error, 'units');
  }
  const units = unitRows.data;
  const unitByLabel = Object.fromEntries(units.map((u) => [u.label, u.id]));

  const peopleRows = await supabase
    .from('people')
    .insert([
      { full_name: 'Demo — Ada Obi', phone: '+234 800 000 0001', role: 'tenant' },
      { full_name: 'Demo — Emeka Nwosu', phone: '+234 800 000 0002', role: 'tenant' },
      { full_name: 'Demo — Hauwa Bala', phone: '+234 800 000 0003', role: 'cleaner' },
    ])
    .select('id, full_name');
  if (peopleRows.error || !peopleRows.data) {
    await cleanup(prop.id);
    return fail(peopleRows.error, 'people');
  }
  const personByName = Object.fromEntries(peopleRows.data.map((p) => [p.full_name, p.id]));

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const mk = (monthOffset: number, day: number) =>
    new Date(y, m + monthOffset, day).toISOString().slice(0, 10);

  const tenancyRows = await supabase
    .from('tenancies')
    .insert([
      { person_id: personByName['Demo — Ada Obi'], unit_id: unitByLabel['Flat A'], rent_amount: 350000, due_day: 5, start_date: mk(-6, 1) },
      { person_id: personByName['Demo — Emeka Nwosu'], unit_id: unitByLabel['Flat B'], rent_amount: 400000, due_day: 1, start_date: mk(-4, 1) },
      { person_id: personByName['Demo — Hauwa Bala'], unit_id: unitByLabel['Shop 1'], rent_amount: 60000, due_day: 10, start_date: mk(-3, 1) },
    ])
    .select('id, person_id');
  if (tenancyRows.error || !tenancyRows.data) {
    await cleanup(prop.id);
    return fail(tenancyRows.error, 'tenancies');
  }
  const tenancyByPerson = Object.fromEntries(tenancyRows.data.map((t) => [t.person_id, t.id]));

  const ada = personByName['Demo — Ada Obi'];
  const emeka = personByName['Demo — Emeka Nwosu'];
  const hauwa = personByName['Demo — Hauwa Bala'];

  const { error: payErr } = await supabase.from('payments').insert([
    // Ada: paid last month AND this month in one transfer (multi-month, paid up)
    {
      person_id: ada, tenancy_id: tenancyByPerson[ada], amount: 700000,
      paid_on: mk(-1, 3), payment_type: 'rent', category: 'rent',
      title: 'Rent — Flat A, two months', merchant: 'Unity Close Management',
      covers_from: mk(-1, 1), covers_to: mk(0, 28),
      note: 'Demo data — one transfer covering two months',
      source: 'manual',
    },
    // Emeka: paid a full year up front (overpaid / in credit)
    {
      person_id: emeka, tenancy_id: tenancyByPerson[emeka], amount: 4800000,
      paid_on: mk(-4, 2), payment_type: 'rent', category: 'rent',
      title: 'Rent — Flat B, full year', merchant: 'Unity Close Management',
      covers_from: mk(-4, 1), covers_to: mk(8, 28),
      note: 'Demo data — full year paid up front',
      source: 'manual',
    },
    // Hauwa: last paid two months ago (overdue)
    {
      person_id: hauwa, tenancy_id: tenancyByPerson[hauwa], amount: 60000,
      paid_on: mk(-2, 9), payment_type: 'rent', category: 'rent',
      title: 'Rent — Shop 1', merchant: 'Unity Close Management',
      covers_from: mk(-2, 1), covers_to: mk(-2, 28),
      note: 'Demo data — last payment two months ago',
      source: 'manual',
    },
    // A cleaning service payment for the property (non-rent activity)
    {
      person_id: hauwa, amount: 25000, paid_on: mk(0, Math.min(new Date().getDate(), 28)),
      payment_type: 'cleaning', category: 'services',
      title: 'Common area cleaning', merchant: 'Hauwa Bala Cleaning Services',
      note: 'Demo data — common area cleaning', source: 'manual',
    },
    // General-document examples (non-rent categories)
    {
      amount: 18000, paid_on: mk(0, Math.min(new Date().getDate(), 28)),
      payment_type: 'other', category: 'utilities',
      title: 'Electricity recharge', merchant: 'Ikeja Electric',
      note: 'Demo data — prepaid meter token', source: 'manual',
    },
    {
      amount: 4500, paid_on: mk(0, Math.min(new Date().getDate(), 28)),
      payment_type: 'other', category: 'transport',
      title: 'Fuel top-up', merchant: 'Total Filling Station',
      note: 'Demo data — receipt photographed at pump', source: 'manual',
    },
  ]);
  if (payErr) {
    await cleanup(prop.id);
    return fail(payErr, 'payments');
  }

  return { error: null };
}

async function cleanup(propertyId: string) {
  await supabase.from('properties').delete().eq('id', propertyId);
}

function fail(err: { message?: string } | null, what: string): { error: string } {
  console.error(`demo seed failed at ${what}`, err);
  return { error: 'Could not load the demo data. Please try again.' };
}

export async function removeDemoData(): Promise<{ error: string | null }> {
  const { error } = await supabase.from('properties').delete().like('name', 'Demo — %');
  if (error) {
    console.error('demo cleanup failed', error);
    return { error: 'Could not remove the demo data. Please try again.' };
  }
  return { error: null };
}
