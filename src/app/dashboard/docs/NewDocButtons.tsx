'use client';
import { useState } from 'react';
import type { DocTemplate } from '@/lib/docTemplates';

export default function NewDocButtons({ templates }: { templates: DocTemplate[] }) {
  const [creating, setCreating] = useState<string | null>(null);

  async function create(t: DocTemplate) {
    setCreating(t.key);
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t.title, content: t.content, doc_type: t.key, icon: t.icon }),
    });
    const data = await res.json();
    if (data.id) { window.location.href = `/dashboard/docs/${data.id}`; return; }
    setCreating(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <button key={t.key} onClick={() => create(t)} disabled={!!creating}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:border-neutral-400 disabled:opacity-50">
          <span>{t.icon}</span>
          <span>{creating === t.key ? 'Creating…' : t.label}</span>
        </button>
      ))}
    </div>
  );
}
