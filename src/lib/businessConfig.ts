// Per-business-type defaults & terminology used to tune individual screens
// (form defaults, labels) to the org's vertical.
export type BizConfig = {
  defaultGst: number;       // default GST % for new invoice lines / products
  defaultUnit: string;      // default product unit
  customerLabel: string;    // what a "customer" is called
  productLabel: string;     // what a "product" is called
};

const DEFAULT: BizConfig = { defaultGst: 18, defaultUnit: 'pcs', customerLabel: 'Customer', productLabel: 'Product' };

export const BUSINESS_CONFIG: Record<string, BizConfig> = {
  cafe:         { defaultGst: 5,  defaultUnit: 'pcs', customerLabel: 'Guest',    productLabel: 'Item' },
  shop:         { defaultGst: 18, defaultUnit: 'pcs', customerLabel: 'Customer', productLabel: 'Product' },
  distributor:  { defaultGst: 18, defaultUnit: 'box', customerLabel: 'Buyer',    productLabel: 'Product' },
  manufacturer: { defaultGst: 18, defaultUnit: 'pcs', customerLabel: 'Customer', productLabel: 'Product' },
  freelancer:   { defaultGst: 18, defaultUnit: 'hrs', customerLabel: 'Client',   productLabel: 'Service' },
  startup:      { defaultGst: 18, defaultUnit: 'pcs', customerLabel: 'Customer', productLabel: 'Product' },
  mall:         { defaultGst: 18, defaultUnit: 'pcs', customerLabel: 'Customer', productLabel: 'Product' },
  general:      DEFAULT,
};

export function bizConfig(type: string | null | undefined): BizConfig {
  return BUSINESS_CONFIG[type ?? 'general'] ?? DEFAULT;
}
