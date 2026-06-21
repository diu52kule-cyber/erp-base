// Builders for the offline JSON that the Government GST e-invoice portal and
// e-way bill portal accept for bulk upload. This does NOT call a GSP API (that
// needs a paid GSP subscription + credentials) — it produces a portal-ready
// JSON file the user can upload to generate the IRN / e-way bill themselves.

type Item = {
  description: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  amount: number;        // taxable value
  gst_amount: number;
  item_type?: string | null;
};

type Inv = {
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  customer_gstin?: string | null;
  billing_address?: string | null;
  place_of_supply?: string | null;
  subtotal: number;
  igst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total: number;
  items: Item[];
};

type Seller = {
  gstin?: string | null;
  legal_name?: string | null;
  state_code?: string | null;
  city?: string | null;
  pincode?: string | null;
};

function ddmmyyyy(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// NIC e-invoice schema v1.1 (single doc inside an array for bulk upload).
export function buildEInvoiceJson(inv: Inv, seller: Seller) {
  const isIGST = (inv.igst_amount ?? 0) > 0;
  const supTyp = inv.customer_gstin ? 'B2B' : 'B2C';
  const sellerState = seller.state_code ?? '';
  const pos = inv.place_of_supply || sellerState;

  const items = inv.items.map((it, i) => {
    const isService = (it.item_type ?? 'service') === 'service';
    const gstHalf = r2(it.gst_amount / 2);
    return {
      SlNo: String(i + 1),
      PrdDesc: it.description.slice(0, 300),
      IsServc: isService ? 'Y' : 'N',
      HsnCd: it.hsn_code || (isService ? '9983' : '9999'),
      Qty: it.quantity,
      Unit: isService ? 'OTH' : 'NOS',
      UnitPrice: r2(it.unit_price),
      TotAmt: r2(it.quantity * it.unit_price),
      AssAmt: r2(it.amount),
      GstRt: it.gst_rate,
      IgstAmt: isIGST ? r2(it.gst_amount) : 0,
      CgstAmt: isIGST ? 0 : gstHalf,
      SgstAmt: isIGST ? 0 : gstHalf,
      TotItemVal: r2(it.amount + it.gst_amount),
    };
  });

  return [{
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: supTyp, RegRev: 'N', IgstOnIntra: 'N' },
    DocDtls: { Typ: 'INV', No: inv.invoice_number, Dt: ddmmyyyy(inv.issue_date) },
    SellerDtls: {
      Gstin: seller.gstin || 'URP',
      LglNm: seller.legal_name || '',
      Addr1: (seller.city || '') + ' (complete address required)',
      Loc: seller.city || '',
      Pin: Number(seller.pincode) || 999999,
      Stcd: sellerState,
    },
    BuyerDtls: {
      Gstin: inv.customer_gstin || 'URP',
      LglNm: inv.customer_name,
      Pos: pos,
      Addr1: inv.billing_address || 'Address',
      Loc: inv.billing_address || '',
      Pin: 999999,
      Stcd: pos,
    },
    ItemList: items,
    ValDtls: {
      AssVal: r2(inv.subtotal),
      CgstVal: r2(inv.cgst_amount ?? 0),
      SgstVal: r2(inv.sgst_amount ?? 0),
      IgstVal: r2(inv.igst_amount ?? 0),
      RndOffAmt: 0,
      TotInvVal: r2(inv.total),
    },
  }];
}

// e-Way Bill bulk JSON schema.
export function buildEWayJson(inv: Inv, seller: Seller) {
  const isIGST = (inv.igst_amount ?? 0) > 0;
  const sellerState = Number(seller.state_code) || 0;
  const toState = Number(inv.place_of_supply) || sellerState;

  return [{
    userGstin: seller.gstin || '',
    supplyType: 'O',
    subSupplyType: '1',
    docType: 'INV',
    docNo: inv.invoice_number,
    docDate: ddmmyyyy(inv.issue_date),
    fromGstin: seller.gstin || 'URP',
    fromTrdName: seller.legal_name || '',
    fromAddr1: seller.city || '',
    fromPlace: seller.city || '',
    fromPincode: Number(seller.pincode) || 999999,
    fromStateCode: sellerState,
    actFromStateCode: sellerState,
    toGstin: inv.customer_gstin || 'URP',
    toTrdName: inv.customer_name,
    toAddr1: inv.billing_address || '',
    toPlace: inv.billing_address || '',
    toPincode: 999999,
    toStateCode: toState,
    actToStateCode: toState,
    transactionType: 1,
    totalValue: r2(inv.subtotal),
    cgstValue: r2(inv.cgst_amount ?? 0),
    sgstValue: r2(inv.sgst_amount ?? 0),
    igstValue: r2(inv.igst_amount ?? 0),
    totInvValue: r2(inv.total),
    transMode: '1',
    transDistance: '0',
    transporterName: '',
    transporterId: '',
    vehicleNo: '',
    vehicleType: 'R',
    itemList: inv.items.map((it, i) => ({
      itemNo: i + 1,
      productName: it.description.slice(0, 100),
      hsnCode: Number(it.hsn_code) || 0,
      quantity: it.quantity,
      qtyUnit: 'NOS',
      taxableAmount: r2(it.amount),
      sgstRate: isIGST ? 0 : it.gst_rate / 2,
      cgstRate: isIGST ? 0 : it.gst_rate / 2,
      igstRate: isIGST ? it.gst_rate : 0,
    })),
  }];
}
