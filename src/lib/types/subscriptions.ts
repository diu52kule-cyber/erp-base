export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};
export const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'trial', 'cancelled', 'expired'];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  cancelled: 'Cancelled',
  expired: 'Expired',
  trial: 'Trial',
};
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: 'bg-green-50 text-green-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
  expired: 'bg-red-50 text-red-600',
  trial: 'bg-blue-50 text-blue-700',
};

export type SubscriptionPlan = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: BillingCycle;
  features: string[];
  is_active: boolean;
  created_at: string;
};

export type CustomerSubscription = {
  id: string;
  org_id: string;
  plan_id: string | null;
  customer_name: string;
  customer_email: string | null;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  next_billing_at: string | null;
  notes: string | null;
  created_at: string;
  plan?: { name: string; price: number; billing_cycle: BillingCycle } | null;
};
