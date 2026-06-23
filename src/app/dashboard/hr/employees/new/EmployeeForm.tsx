'use client';

import { useState } from 'react';
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from '@/lib/types/hr';
import { ORG_ROLES, ROLE_LABELS } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

const today = () => new Date().toISOString().split('T')[0];

const EMPLOYEE_ROLES: OrgRole[] = [
  'staff', 'manager', 'accountant', 'hr', 'sales', 'marketing',
  'developer', 'designer', 'support', 'operations', 'cashier',
  'warehouse', 'procurement', 'chef', 'store_manager', 'viewer',
];

type Credentials = { email: string; password: string };

function CredentialsModal({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Login account created</h2>
            <p className="text-sm text-neutral-500">Share these credentials with the employee</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-neutral-50 p-4 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Email</p>
              <p className="text-sm font-mono font-medium">{creds.email}</p>
            </div>
            <button onClick={() => copy(creds.email, 'email')}
              className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1">
              {copied === 'email' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="border-t border-neutral-200 pt-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Password</p>
              <p className="text-sm font-mono font-medium tracking-wider">{creds.password}</p>
            </div>
            <button onClick={() => copy(creds.password, 'password')}
              className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1">
              {copied === 'password' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="border-t border-neutral-200 pt-3">
            <button onClick={() => copy(`Email: ${creds.email}\nPassword: ${creds.password}`, 'both')}
              className="w-full rounded-lg bg-neutral-900 py-2 text-sm text-white hover:bg-neutral-700">
              {copied === 'both' ? 'Copied!' : 'Copy both'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-400 text-center">
          This password won't be shown again. The employee can change it via Settings → Password after logging in.
        </p>

        <button onClick={onClose}
          className="mt-4 w-full rounded-lg border border-neutral-200 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
          Done — go to employee profile
        </button>
      </div>
    </div>
  );
}

export default function EmployeeForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employment_type: 'full-time',
    joining_date: today(),
    monthly_salary: '',
    create_login: false,
    role: 'staff' as OrgRole,
  });

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!consentGiven) { setError('Please confirm data processing consent before enrolling the employee'); return; }
    if (form.create_login && !form.email.trim()) { setError('Email is required to create a login'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to save employee');
        setPending(false);
        return;
      }
      setSavedId(data.id);
      if (data.generated_password) {
        setCredentials({ email: data.login_email, password: data.generated_password });
      } else {
        window.location.href = `/dashboard/hr/employees/${data.id}`;
      }
    } catch {
      setError('Failed to save employee');
      setPending(false);
    }
  }

  if (credentials && savedId) {
    return (
      <CredentialsModal
        creds={credentials}
        onClose={() => { window.location.href = `/dashboard/hr/employees/${savedId}`; }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Personal Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Full Name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Employee full name"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Email {form.create_login && <span className="text-red-500">*</span>}
            </label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="employee@example.com"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Job Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Department</label>
            <input type="text" value={form.department} onChange={(e) => set('department', e.target.value)}
              placeholder="e.g. Engineering, Sales"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Designation</label>
            <input type="text" value={form.designation} onChange={(e) => set('designation', e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Employment Type</label>
            <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Joining Date</label>
            <input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Monthly Salary (₹)</label>
            <input type="number" value={form.monthly_salary} onChange={(e) => set('monthly_salary', e.target.value)}
              min="0" step="100" placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      {/* Login account section */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Workspace Login</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Create an account so this employee can log in, view payslips, and submit leave requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => set('create_login', !form.create_login)}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.create_login ? 'bg-neutral-900' : 'bg-neutral-200'}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.create_login ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {form.create_login && (
          <div className="mt-4 rounded-lg bg-neutral-50 p-4 border border-neutral-200 space-y-3">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              A password will be auto-generated and shown to you after saving. The employee will also receive it by email.
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Permission Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                {EMPLOYEE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-400">Controls what modules and actions this employee can access.</p>
            </div>
          </div>
        )}
      </div>

      {/* Data processing consent — required under India's DPDP Act 2023 */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900 cursor-pointer"
          />
          <span className="text-sm text-neutral-600 leading-relaxed">
            I confirm this employee has been informed that their personal data (name, contact details, salary, attendance) will be stored and processed to manage employment as described in the{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-900 underline underline-offset-2">Privacy Policy</a>.
            This consent is required under India&apos;s Digital Personal Data Protection Act 2023.
          </span>
        </label>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={pending || !consentGiven}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
}
