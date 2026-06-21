// Single source of truth for invoice math — used by the form (live preview),
// the create API, the edit API, conversions and credit notes so every path
// computes identical totals.
//
// Order of operations (GST-correct):
//   1. line gross = qty * unit_price
//   2. line discount (percent or flat) -> line net (taxable)
//   3. bill-level discount apportioned across line nets (keeps per-line GST right)
//   4. GST per line on the apportioned taxable value
//   5. optional round-off of the grand total to the nearest rupee

export type DiscountType = 'percent' | 'amount' | null | undefined;

export type CalcLine = {
  description?: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_type?: DiscountType;
  discount_value?: number;
};

export type ComputedLine = {
  gross: number;
  discount_amount: number;
  amount: number; // taxable value after line + apportioned bill discount
  gst_amount: number;
};

export type InvoiceTotals = {
  lines: ComputedLine[];
  lineSubtotal: number; // sum of line nets, before bill discount
  billDiscountAmount: number;
  taxableTotal: number; // after bill discount
  gstTotal: number;
  roundOff: number;
  total: number;
};

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function computeInvoiceTotals(
  rawLines: CalcLine[],
  opts?: { discountType?: DiscountType; discountValue?: number; roundOffEnabled?: boolean },
): InvoiceTotals {
  const stage1 = rawLines.map((l) => {
    const gross = r2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0));
    let discount = 0;
    if (l.discount_type === 'percent') discount = r2((gross * (Number(l.discount_value) || 0)) / 100);
    else if (l.discount_type === 'amount') discount = Math.min(gross, Number(l.discount_value) || 0);
    const net = r2(gross - discount);
    return { l, gross, discount, net };
  });

  const lineSubtotal = r2(stage1.reduce((s, x) => s + x.net, 0));

  let billDiscountAmount = 0;
  if (opts?.discountType === 'percent') billDiscountAmount = r2((lineSubtotal * (Number(opts.discountValue) || 0)) / 100);
  else if (opts?.discountType === 'amount') billDiscountAmount = Math.min(lineSubtotal, Number(opts.discountValue) || 0);

  const factor = lineSubtotal > 0 ? (lineSubtotal - billDiscountAmount) / lineSubtotal : 1;

  const lines: ComputedLine[] = stage1.map(({ l, gross, discount }) => {
    const net = r2(gross - discount);
    const amount = r2(net * factor);
    const gst_amount = r2((amount * (Number(l.gst_rate) || 0)) / 100);
    return { gross, discount_amount: discount, amount, gst_amount };
  });

  const taxableTotal = r2(lines.reduce((s, x) => s + x.amount, 0));
  const gstTotal = r2(lines.reduce((s, x) => s + x.gst_amount, 0));
  const preRound = r2(taxableTotal + gstTotal);

  let roundOff = 0;
  let total = preRound;
  if (opts?.roundOffEnabled) {
    total = Math.round(preRound);
    roundOff = r2(total - preRound);
  }

  return { lines, lineSubtotal, billDiscountAmount, taxableTotal, gstTotal, roundOff, total };
}
