'use client';
import { useState } from 'react';

export type PickContact = { id: string; name: string; company?: string | null; email?: string | null; gstin?: string | null; address?: string | null };

// Customer/contact autocomplete. Typing filters the CRM contacts; picking one
// links the record (customer_id) and fills name/email/GSTIN/address.
export default function ContactPicker({
  value, onChange, onPick, contacts, placeholder = 'Customer name', className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: PickContact) => void;
  contacts: PickContact[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = (q
    ? contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q))
    : contacts).slice(0, 8);

  return (
    <div className="relative">
      <input
        type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className || 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900'}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {matches.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(c); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">
              <span className="font-medium">{c.name}</span>
              {c.company ? <span className="text-neutral-400"> · {c.company}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
