'use client';
import { useState } from 'react';
import { OFFER_TYPES, offerLabel, isOfferActive, type Offer } from '@/lib/offers';
import { toast } from '@/lib/toast';

type OfferRow = Offer & { product?: { name: string } | null };

const inputCls = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900';

export default function OffersClient({ initial, products }: {
  initial: OfferRow[];
  products: { id: string; name: string }[];
}) {
  const [offers, setOffers] = useState<OfferRow[]>(initial);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ title: '', product_id: '', offer_type: 'percent', value: '', label_text: '', starts_on: '', ends_on: '' });

  function set(k: keyof typeof f, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function create() {
    if (!f.title.trim()) { toast('Enter an offer title', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json();
    setSaving(false);
    if (data.error) { toast(data.error, 'error'); return; }
    toast('Offer created', 'success');
    window.location.reload();
  }

  async function toggle(o: OfferRow) {
    setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, active: !x.active } : x)));
    await fetch(`/api/offers/${o.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !o.active }) });
  }

  async function remove(o: OfferRow) {
    if (!confirm(`Delete offer "${o.title}"?`)) return;
    setOffers((prev) => prev.filter((x) => x.id !== o.id));
    await fetch(`/api/offers/${o.id}`, { method: 'DELETE' });
  }

  const needsValue = f.offer_type === 'percent' || f.offer_type === 'flat';

  return (
    <div className="space-y-6">
      {/* Create */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Create an offer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Title *</label>
            <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Diwali Sale" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Applies to</label>
            <select className={inputCls} value={f.product_id} onChange={(e) => set('product_id', e.target.value)}>
              <option value="">All products (store-wide)</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Type</label>
            <select className={inputCls} value={f.offer_type} onChange={(e) => set('offer_type', e.target.value)}>
              {OFFER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {needsValue && (
            <div>
              <label className="mb-1 block text-sm text-neutral-600">{f.offer_type === 'percent' ? 'Percent off (%)' : 'Flat amount (₹)'}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={f.value} onChange={(e) => set('value', e.target.value)} placeholder="0" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Label text (on barcode)</label>
            <input className={inputCls} value={f.label_text} onChange={(e) => set('label_text', e.target.value)} placeholder="Auto (e.g. 10% OFF)" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-sm text-neutral-600">Starts</label><input type="date" className={inputCls} value={f.starts_on} onChange={(e) => set('starts_on', e.target.value)} /></div>
            <div><label className="mb-1 block text-sm text-neutral-600">Ends</label><input type="date" className={inputCls} value={f.ends_on} onChange={(e) => set('ends_on', e.target.value)} /></div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={create} disabled={saving} className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">{saving ? 'Saving…' : 'Create offer'}</button>
        </div>
      </section>

      {/* List */}
      {offers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-500">No offers yet. Create one above.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Offer</th>
                <th className="px-4 py-3 text-left font-medium">Applies to</th>
                <th className="px-4 py-3 text-left font-medium">Label</th>
                <th className="px-4 py-3 text-left font-medium">Window</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {offers.map((o) => {
                const live = isOfferActive(o);
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3"><span className="font-medium">{o.title}</span></td>
                    <td className="px-4 py-3 text-neutral-600">{o.product?.name ?? <span className="text-neutral-400">All products</span>}</td>
                    <td className="px-4 py-3"><span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{offerLabel(o)}</span></td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{o.starts_on ?? '—'} → {o.ends_on ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${!o.active ? 'bg-neutral-100 text-neutral-500' : live ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {!o.active ? 'off' : live ? 'live' : 'scheduled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggle(o)} className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50">{o.active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => remove(o)} className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
