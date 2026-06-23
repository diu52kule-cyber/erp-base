import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import HolidaysClient from './HolidaysClient';
import NavSelect from '@/components/NavSelect';

export const dynamic = 'force-dynamic';

export default async function HolidaysPage({ searchParams }: { searchParams: { year?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const year = searchParams.year ?? new Date().getFullYear().toString();
  const supabase = createClient();

  let holidays: any[] = [];
  try {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .eq('org_id', ctx.org.id)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date');
    holidays = data ?? [];
  } catch { /* migration not run yet */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-1 text-2xl font-semibold">Holiday Calendar</h1>
          <p className="mt-0.5 text-sm text-neutral-500">{holidays.length} holidays in {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <NavSelect
            name="year"
            value={year}
            baseHref="/dashboard/hr/holidays"
            options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
      </div>
      <HolidaysClient initialHolidays={holidays} year={year} />
    </div>
  );
}
