import { GST_RATES } from './billing';

export { GST_RATES };

export const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'hrs', 'days'] as const;
export type Unit = (typeof UNITS)[number];

export type StockMovementType = 'in' | 'out' | 'adjustment';

export type Product = {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  barcode?: string | null;
  description: string | null;
  unit: Unit;
  selling_price: number;
  cost_price: number;
  category: string | null;
  brand: string | null;
  tax_inclusive: boolean;
  gst_rate: number;
  hsn_code: string | null;
  stock_qty: number;
  low_stock_threshold: number;
  reorder_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductBatch = {
  id: string;
  org_id: string;
  product_id: string;
  batch_no: string;
  expiry_date: string | null;
  qty: number;
  cost_price: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockMovement = {
  id: string;
  org_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreateProductInput = {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit: Unit;
  selling_price: number;
  cost_price?: number;
  category?: string;
  brand?: string;
  tax_inclusive?: boolean;
  gst_rate: number;
  hsn_code?: string;
  opening_stock?: number;
  low_stock_threshold?: number;
  reorder_qty?: number;
};
