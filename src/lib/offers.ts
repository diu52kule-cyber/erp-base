export type OfferType = 'percent' | 'flat' | 'bogo' | 'combo';

export type Offer = {
  id: string;
  org_id: string;
  product_id: string | null;
  title: string;
  offer_type: OfferType;
  value: number;
  label_text: string | null;
  description: string | null;
  active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
};

export const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: 'percent', label: '% off' },
  { value: 'flat', label: 'Flat ₹ off' },
  { value: 'bogo', label: 'Buy 1 Get 1' },
  { value: 'combo', label: 'Combo / custom' },
];

// Short text to print on a label (or show as a badge).
export function offerLabel(o: Pick<Offer, 'offer_type' | 'value' | 'label_text' | 'title'>): string {
  if (o.label_text && o.label_text.trim()) return o.label_text.trim();
  if (o.offer_type === 'percent') return `${Number(o.value)}% OFF`;
  if (o.offer_type === 'flat') return `₹${Number(o.value)} OFF`;
  if (o.offer_type === 'bogo') return 'BUY 1 GET 1';
  return o.title;
}

// Is the offer live today?
export function isOfferActive(o: Pick<Offer, 'active' | 'starts_on' | 'ends_on'>, today = new Date().toISOString().slice(0, 10)): boolean {
  if (!o.active) return false;
  if (o.starts_on && o.starts_on > today) return false;
  if (o.ends_on && o.ends_on < today) return false;
  return true;
}
