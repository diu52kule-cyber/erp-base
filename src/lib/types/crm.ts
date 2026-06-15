export type ContactType = 'lead' | 'customer' | 'vendor';
export type DealStage = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const CONTACT_TYPES: ContactType[] = ['lead', 'customer', 'vendor'];
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  lead: 'Lead',
  customer: 'Customer',
  vendor: 'Vendor',
};
export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  lead: 'bg-blue-50 text-blue-700',
  customer: 'bg-green-50 text-green-700',
  vendor: 'bg-purple-50 text-purple-700',
};

export const DEAL_STAGES: DealStage[] = ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'New Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};
export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  lead: 'bg-neutral-100 text-neutral-700',
  contacted: 'bg-blue-50 text-blue-700',
  proposal: 'bg-amber-50 text-amber-700',
  negotiation: 'bg-orange-50 text-orange-700',
  won: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-600',
};

export type Contact = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ContactType;
  company: string | null;
  gstin: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  org_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  stage: DealStage;
  expected_close: string | null;
  notes: string | null;
  created_at: string;
  contact?: { name: string; company: string | null } | null;
};
