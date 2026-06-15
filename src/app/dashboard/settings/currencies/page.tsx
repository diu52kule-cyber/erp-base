'use client';
import { useEffect, useState } from 'react';

type Currency = { code: string; name: string; symbol: string };
type OrgSetting = { currency_code: string; exchange_rate: number; enabled: boolean };

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [orgSettings, setOrgSettings] = useState<Record<string, OrgSetting>>({});
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/currencies').then((r) => r.json()).then(({ currencies: c, orgSettings: s }) => {
      setCurrencies(c);
      const map: Record<string, OrgSetting> = {};
      s.forEach((o: OrgSetting) => { map[o.currency_code] = o; });
      setOrgSettings(map);
      const rateMap: Record<string, string> = {};
      s.forEach((o: OrgSetting) => { rateMap[o.currency_code] = String(o.exchange_rate); });
      setRates(rateMap);
    });
  }, []);

  async function save(code: string) {
    setSaving(code);
    const rate = parseFloat(rates[code] || '1');
    await fetch('/api/currencies', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, exchange_rate: rate, enabled: true }) });
    setSaving(null);
    setOrgSettings((s) => ({ ...s, [code]: { currency_code: code, exchange_rate: rate, enabled: true } }));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Multi-currency Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Set exchange rates relative to INR (base currency).</p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <th className="px-4 py-3 text-left font-medium">Currency</th>
            <th className="px-4 py-3 text-left font-medium">Code</th>
            <th className="px-4 py-3 text-left font-medium">Rate (per INR)</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {currencies.map((c) => (
              <tr key={c.code} className="hover:bg-neutral-50">
                <td className="px-4 py-3">{c.symbol} {c.name}</td>
                <td className="px-4 py-3 font-mono">{c.code}</td>
                <td className="px-4 py-3">
                  {c.code === 'INR' ? <span className="text-neutral-400">Base (1.00)</span> : (
                    <input type="number" step="0.0001" value={rates[c.code] ?? orgSettings[c.code]?.exchange_rate ?? ''}
                      onChange={(e) => setRates((r) => ({ ...r, [c.code]: e.target.value }))}
                      className="w-32 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm" placeholder="e.g. 0.012" />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.code !== 'INR' && (
                    <button onClick={() => save(c.code)} disabled={saving === c.code}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-50">
                      {saving === c.code ? 'Saving…' : orgSettings[c.code] ? 'Update' : 'Save'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
