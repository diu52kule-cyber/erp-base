export type StatutorySettings = {
  org_id: string;
  pf_enabled: boolean;
  esi_enabled: boolean;
  pt_enabled: boolean;
  pt_state: string;
  tds_enabled: boolean;
};

export const PT_STATES = [
  { code: 'MH', name: 'Maharashtra' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TS', name: 'Telangana' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'OD', name: 'Odisha' },
  { code: 'OTHER', name: 'Other (₹200 flat)' },
];

const PF_BASIC_CAP = 15000;
const ESI_GROSS_LIMIT = 21000;

export function calcBasic(gross: number, basicPct: number): number {
  return Math.round((gross * basicPct) / 100);
}

export function calcPF(basic: number): { employee: number; employer: number } {
  const cappedBasic = Math.min(basic, PF_BASIC_CAP);
  const employee = Math.round(cappedBasic * 0.12);
  const employer = Math.round(cappedBasic * 0.12);
  return { employee, employer };
}

export function calcESI(gross: number): { employee: number; employer: number } | null {
  if (gross > ESI_GROSS_LIMIT) return null;
  return {
    employee: Math.round(gross * 0.0075),
    employer: Math.round(gross * 0.0325),
  };
}

// Professional Tax monthly amount based on state and gross salary
export function calcPT(gross: number, state: string, month: string): number {
  const isFeb = new Date(month + '-01').getMonth() === 1;
  switch (state) {
    case 'MH':
      if (gross <= 7500) return 0;
      if (gross <= 10000) return 175;
      return isFeb ? 300 : 200;
    case 'KA':
      if (gross <= 15000) return 0;
      if (gross <= 29999) return 200;
      return 200;
    case 'TS':
    case 'AP':
      if (gross <= 15000) return 0;
      if (gross <= 20000) return 150;
      return 200;
    case 'TN':
      if (gross <= 21000) return 0;
      if (gross <= 30000) return 135;
      if (gross <= 45000) return 315;
      if (gross <= 60000) return 690;
      if (gross <= 75000) return 1025;
      return 1250;
    case 'WB':
      if (gross <= 10000) return 0;
      if (gross <= 15000) return 110;
      if (gross <= 25000) return 130;
      if (gross <= 40000) return 150;
      return 200;
    case 'MP':
      if (gross <= 18750) return 0;
      if (gross <= 25000) return 125;
      if (gross <= 33333) return 167;
      return 208;
    default:
      return gross > 10000 ? 200 : 0;
  }
}

// Estimate monthly TDS using new tax regime (FY 2024-25)
// Standard deduction ₹75,000 applied to annual income
export function calcMonthlyTDS(monthlyGross: number): number {
  const annualGross = monthlyGross * 12;
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);

  if (taxableIncome <= 300000) return 0;
  // Rebate u/s 87A: if taxable income ≤ 7L, tax = 0 (new regime)
  if (taxableIncome <= 700000) return 0;

  let tax = 0;
  if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
  if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1500000) - 1200000) * 0.20;
  if (taxableIncome > 1000000) tax += (Math.min(taxableIncome, 1200000) - 1000000) * 0.15;
  if (taxableIncome > 700000)  tax += (Math.min(taxableIncome, 1000000) - 700000)  * 0.10;
  if (taxableIncome > 300000)  tax += (Math.min(taxableIncome, 700000)  - 300000)  * 0.05;

  // Health & Education cess 4%
  tax = tax * 1.04;

  return Math.round(tax / 12);
}

export type DeductionResult = {
  basic: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  totalEmployeeDeductions: number;
  netSalary: number;
};

export function computeDeductions(
  gross: number,
  basicPct: number,
  settings: StatutorySettings,
  month: string,
): DeductionResult {
  const basic = calcBasic(gross, basicPct);

  const pf    = settings.pf_enabled  ? calcPF(basic)         : { employee: 0, employer: 0 };
  const esi   = settings.esi_enabled ? calcESI(gross)         : null;
  const pt    = settings.pt_enabled  ? calcPT(gross, settings.pt_state, month) : 0;
  const tds   = settings.tds_enabled ? calcMonthlyTDS(gross)  : 0;

  const esiEmployee = esi?.employee ?? 0;
  const esiEmployer = esi?.employer ?? 0;
  const total = pf.employee + esiEmployee + pt + tds;

  return {
    basic,
    pfEmployee: pf.employee,
    pfEmployer: pf.employer,
    esiEmployee,
    esiEmployer,
    professionalTax: pt,
    tds,
    totalEmployeeDeductions: total,
    netSalary: Math.max(0, Math.round(gross - total)),
  };
}
