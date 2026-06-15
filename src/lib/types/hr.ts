export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';
export type EmployeeStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave';
export type PayrollRunStatus = 'draft' | 'processed';

export const EMPLOYMENT_TYPES: EmploymentType[] = ['full-time', 'part-time', 'contract', 'intern'];
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  'contract': 'Contract',
  'intern': 'Intern',
};

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'half-day', 'leave'];
export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  'half-day': 'Half Day',
  leave: 'Leave',
};
export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-600',
  'half-day': 'bg-amber-50 text-amber-700',
  leave: 'bg-blue-50 text-blue-700',
};

export type Employee = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  employment_type: EmploymentType;
  joining_date: string;
  monthly_salary: number;
  status: EmployeeStatus;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  org_id: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  employee?: { name: string } | null;
};

export type PayrollRun = {
  id: string;
  org_id: string;
  month: string;
  working_days: number;
  status: PayrollRunStatus;
  total_gross: number;
  total_net: number;
  created_at: string;
};

export type PayrollEntry = {
  id: string;
  run_id: string;
  employee_id: string;
  present_days: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  notes: string | null;
  employee?: { name: string; designation: string | null } | null;
};
