export type PaymentType = 'rent' | 'cleaning' | 'guard' | 'other';
export type DocCategory = 'rent' | 'utilities' | 'groceries' | 'services' | 'goods' | 'transport' | 'medical' | 'education' | 'other';
export type PersonRole = 'tenant' | 'cleaner' | 'guard' | 'provider';
export type PaymentSource = 'manual' | 'ai' | 'telegram';
export type PersonStatus = 'paid' | 'partial' | 'overdue' | 'overpaid' | 'n/a';

export interface Profile {
  id: string;
  display_name: string;
  currency: string;
  nudge_enabled: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  user_id?: string;
  name: string;
  address: string;
  created_at?: string;
}

export interface Unit {
  id: string;
  user_id?: string;
  property_id: string;
  label: string;
  created_at?: string;
}

export interface Person {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  role: PersonRole;
  notes: string;
  created_at?: string;
}

export interface Tenancy {
  id: string;
  user_id?: string;
  person_id: string;
  unit_id: string;
  rent_amount: number;
  due_day: number;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  created_at?: string;
}

export interface Payment {
  id: string;
  user_id?: string;
  person_id: string | null;
  tenancy_id: string | null;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  payment_type: PaymentType;
  category: DocCategory;
  title: string;
  merchant: string;
  doc_hash: string;
  covers_from: string | null;
  covers_to: string | null;
  slip_image_path: string;
  note: string;
  source: PaymentSource;
  created_at?: string;
}

export interface Case {
  id: string;
  name: string;
  description: string;
  status: 'open' | 'resolved';
  created_at: string;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  payment_id: string;
}

export interface ShareLink {
  id: string;
  token: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export interface PersonWithStatus extends Person {
  status: PersonStatus;
  balance: number; // positive = overpaid credit, negative = owed
  owedMonths: string[]; // YYYY-MM strings owed
  coveredThrough: string | null; // YYYY-MM last covered month (rent only)
  tenancy?: Tenancy;
  unit?: Unit;
  property?: Property;
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  rent: 'Rent',
  cleaning: 'Cleaning',
  guard: 'Guard',
  other: 'Other',
};

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  rent: 'Rent & housing',
  utilities: 'Utilities',
  groceries: 'Groceries',
  services: 'Services',
  goods: 'Goods',
  transport: 'Transport',
  medical: 'Medical',
  education: 'Education',
  other: 'Other',
};

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  tenant: 'Tenant',
  cleaner: 'Cleaner',
  guard: 'Guard',
  provider: 'Provider',
};
