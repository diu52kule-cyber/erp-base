'use client';
import { useState } from 'react';

type Msg = { role: 'user' | 'assistant'; text: string };

const SUGGESTIONS = [
  'Which tasks are blocked?',
  'What is overdue right now?',
  'Summarize today’s team check-ins',
  'What needs my attention today?',
  'Any low-stock items?',
];

export default function AssistantClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput(''); setLoading(true);
    const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
    const data = await res.json();
    setLoading(false);
    setMessages((m) => [...m, { role: 'assistant', text: data.answer ?? data.error ?? 'No response.' }]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">✨ AI Assistant</h1>
        <p className="text-neutral-500 mt-1 text-sm">Ask anything about your workspace — tasks, issues, goals, stock, billing.</p>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:border-neutral-400">{s}</button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`rounded-xl border p-4 ${m.role === 'user' ? 'border-neutral-200 bg-neutral-50 ml-8' : 'border-neutral-200 bg-white mr-8'}`}>
            <div className="mb-1 text-xs font-semibold text-neutral-400">{m.role === 'user' ? 'You' : 'Assistant'}</div>
            <div className="whitespace-pre-wrap text-sm text-neutral-700">{m.text}</div>
          </div>
        ))}
        {loading && <div className="rounded-xl border border-neutral-200 bg-white p-4 mr-8 text-sm text-neutral-400">Thinking…</div>}
      </div>

      <div className="sticky bottom-4 flex gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="Ask the assistant…" className="flex-1 rounded-lg border-0 px-3 py-2 text-sm focus:outline-none bg-transparent" />
        <button onClick={() => ask(input)} disabled={loading || !input.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">Ask</button>
      </div>
    </div>
  );
}
