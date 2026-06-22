'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type CalEvent = {
  id: string;
  title: string;
  date: string;
  type: 'meeting' | 'task' | 'leave' | 'holiday';
  status?: string;
};

const TYPE_COLORS: Record<CalEvent['type'], string> = {
  meeting: 'bg-blue-50 text-blue-700 border border-blue-200',
  task:    'bg-amber-50 text-amber-700 border border-amber-200',
  leave:   'bg-red-50 text-red-600 border border-red-200',
  holiday: 'bg-purple-50 text-purple-700 border border-purple-200',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TeamCalendarPage() {
  const params = useParams<{ id: string }>();
  const teamId = params.id;

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDay    = getDaysInMonth(year, month);
      const endDate   = `${year}-${String(month + 1).padStart(2, '0')}-${endDay}`;
      const res = await fetch(`/api/teams/${teamId}/calendar?start=${startDate}&end=${endDate}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [teamId, year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const startDay    = getFirstDayOfWeek(year, month);

  // Group events by day
  const byDay: Record<number, CalEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.date).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(ev);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/teams/${teamId}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Team</Link>
          <h1 className="text-xl font-semibold">Team Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">‹</button>
          <span className="text-sm font-medium w-36 text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">›</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.entries(TYPE_COLORS) as [CalEvent['type'], string][]).map(([type, cls]) => (
          <span key={type} className={`rounded-full px-2 py-0.5 ${cls}`}>{type}</span>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-neutral-100">
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-neutral-400">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before month start */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-neutral-100 bg-neutral-50" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
              const dayEvents = byDay[day] ?? [];
              return (
                <div key={day} className={`min-h-[90px] border-b border-r border-neutral-100 p-1.5 ${isToday ? 'bg-blue-50/50' : ''}`}>
                  <p className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-neutral-500'}`}>{day}</p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div key={ev.id} className={`rounded px-1 py-0.5 text-xs truncate ${TYPE_COLORS[ev.type]}`}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-neutral-400">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Fill remaining cells */}
            {Array.from({ length: (7 - ((startDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
              <div key={`end-${i}`} className="min-h-[90px] border-b border-r border-neutral-100 bg-neutral-50" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
