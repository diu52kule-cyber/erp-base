export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

export const STATE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  INDIAN_STATES.map((s) => [s.code, s.name])
);

export type SupplyType = 'B2B' | 'B2CS' | 'B2CL' | 'export' | 'nil';
export type FilingPeriod = 'monthly' | 'quarterly';

export type OrgGstSettings = {
  org_id: string;
  gstin: string | null;
  legal_name: string | null;
  state_code: string | null;
  filing_period: FilingPeriod;
};

// Derive supply type from invoice fields
export function deriveSupplyType(customerGstin: string | null, total: number): SupplyType {
  if (customerGstin?.trim()) return 'B2B';
  if (total > 250000) return 'B2CL';
  return 'B2CS';
}

// Split GST into IGST or CGST+SGST based on whether supply is inter-state
export function splitGst(gstAmount: number, isInterState: boolean) {
  if (isInterState) {
    return { igst: gstAmount, cgst: 0, sgst: 0 };
  }
  const half = Math.round(gstAmount * 50) / 100;
  return { igst: 0, cgst: half, sgst: half };
}

// Get financial years list: current and past 3
export function getFYOptions(): { label: string; value: string }[] {
  const now = new Date();
  const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => {
    const y = curYear - i;
    return { label: `${y}-${String(y + 1).slice(-2)}`, value: `${y}` };
  });
}

export function getFYDateRange(fy: string): { start: string; end: string } {
  const y = parseInt(fy);
  return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
}

export function getMonthOptions(fy: string): { label: string; value: string }[] {
  const y = parseInt(fy);
  const months = [
    { m: 4, y }, { m: 5, y }, { m: 6, y },
    { m: 7, y }, { m: 8, y }, { m: 9, y },
    { m: 10, y }, { m: 11, y }, { m: 12, y },
    { m: 1, y: y + 1 }, { m: 2, y: y + 1 }, { m: 3, y: y + 1 },
  ];
  return months.map(({ m, y: yr }) => {
    const d = new Date(yr, m - 1, 1);
    return {
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      value: `${yr}-${String(m).padStart(2, '0')}`,
    };
  });
}

export function getQuarterOptions(fy: string): { label: string; value: string }[] {
  const y = parseInt(fy);
  return [
    { label: `Apr–Jun ${y}`,      value: `${y}-Q1` },
    { label: `Jul–Sep ${y}`,      value: `${y}-Q2` },
    { label: `Oct–Dec ${y}`,      value: `${y}-Q3` },
    { label: `Jan–Mar ${y + 1}`,  value: `${y}-Q4` },
  ];
}

export function periodToDateRange(period: string): { start: string; end: string } {
  if (period.includes('-Q')) {
    const [y, q] = period.split('-Q');
    const yr = parseInt(y);
    const qn = parseInt(q);
    const ranges: Record<number, { start: string; end: string }> = {
      1: { start: `${yr}-04-01`,     end: `${yr}-06-30` },
      2: { start: `${yr}-07-01`,     end: `${yr}-09-30` },
      3: { start: `${yr}-10-01`,     end: `${yr}-12-31` },
      4: { start: `${yr + 1}-01-01`, end: `${yr + 1}-03-31` },
    };
    return ranges[qn];
  }
  // Monthly: YYYY-MM
  const [yr, mn] = period.split('-').map(Number);
  const lastDay = new Date(yr, mn, 0).getDate();
  return {
    start: `${yr}-${String(mn).padStart(2, '0')}-01`,
    end:   `${yr}-${String(mn).padStart(2, '0')}-${lastDay}`,
  };
}
