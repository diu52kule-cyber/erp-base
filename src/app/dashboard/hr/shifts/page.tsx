import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ShiftsClient from './ShiftsClient';

function getWeekBounds(weekOf?: string) {
  const d = weekOf ? new Date(weekOf) : new Date();
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split('T')[0],
    end:   sun.toISOString().split('T')[0],
  };
}

export default async function ShiftsPage({ searchParams }: { searchParams: { week_of?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const { start, end } = getWeekBounds(searchParams.week_of);
  const supabase = createClient();

  const [{ data: employees }, shiftsResult] = await Promise.all([
    supabase.from('employees').select('id,name,designation,department').eq('org_id', ctx.org.id).eq('status', 'active').is('archived_at', null).order('name'),
    (async () => {
      try {
        return await supabase
          .from('shifts')
          .select('*, employee:employees(name)')
          .eq('org_id', ctx.org!.id)
          .gte('date', start)
          .lte('date', end);
      } catch { return { data: [] }; }
    })(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-1 text-2xl font-semibold">Shift Scheduling</h1>
          <p className="mt-1 text-sm text-neutral-500">Weekly roster for {start} to {end}</p>
        </div>
      </div>

      <ShiftsClient
        weekStart={start}
        weekEnd={end}
        employees={employees ?? []}
        initialShifts={shiftsResult.data ?? []}
      />
    </div>
  );
}
