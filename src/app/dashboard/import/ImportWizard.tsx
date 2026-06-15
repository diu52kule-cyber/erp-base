'use client';

import { useState, useRef } from 'react';

type ImportType = 'contacts' | 'products' | 'employees';

const IMPORT_TYPES: { key: ImportType; label: string; description: string; requiredCols: string }[] = [
  { key: 'contacts', label: 'Contacts', description: 'CRM contacts (leads, customers, vendors)', requiredCols: 'name' },
  { key: 'products', label: 'Products', description: 'Inventory products / SKUs', requiredCols: 'name' },
  { key: 'employees', label: 'Employees', description: 'HR employee records', requiredCols: 'name' },
];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows };
}

export default function ImportWizard() {
  const [step, setStep] = useState<'type' | 'upload' | 'preview' | 'done'>('type');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) { setError('Could not parse CSV — check file format'); return; }
      setHeaders(headers);
      setRows(rows);
      setError(null);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importType) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/${importType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { setImportedCount(data.imported); setStep('done'); }
    } catch { setError('Import failed — check your connection'); setPending(false); }
  }

  function reset() {
    setStep('type');
    setImportType(null);
    setHeaders([]);
    setRows([]);
    setError(null);
    setPending(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm">
        {(['type', 'upload', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${step === s ? 'bg-neutral-900 text-white' : ['type','upload','preview','done'].indexOf(step) > i ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
              {['type','upload','preview','done'].indexOf(step) > i ? '✓' : i + 1}
            </span>
            <span className={step === s ? 'font-medium' : 'text-neutral-400'}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            {i < 3 && <span className="text-neutral-300">→</span>}
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {step === 'type' && (
        <div className="space-y-3">
          <h2 className="font-medium">What are you importing?</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {IMPORT_TYPES.map((t) => (
              <button key={t.key} onClick={() => { setImportType(t.key); setStep('upload'); }}
                className="rounded-xl border-2 border-neutral-200 p-5 text-left hover:border-neutral-400 transition-colors">
                <p className="font-medium">{t.label}</p>
                <p className="mt-1 text-sm text-neutral-500">{t.description}</p>
                <p className="mt-2 text-xs text-neutral-400">Required: {t.requiredCols}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Upload CSV for {importType}</h2>
            <button onClick={() => setStep('type')} className="text-sm text-neutral-400 hover:text-neutral-700">← Back</button>
          </div>
          <div className="rounded-xl border-2 border-dashed border-neutral-200 p-10 text-center">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <p className="text-neutral-500">Click to select a CSV file</p>
              <p className="mt-1 text-sm text-neutral-400">First row must be headers</p>
              <div className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Browse files</div>
            </label>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 space-y-1">
            <p className="font-medium">Tips:</p>
            <p>• Save your spreadsheet as CSV (UTF-8)</p>
            <p>• Column headers are matched case-insensitively</p>
            <p>• Rows with empty &quot;name&quot; column are skipped</p>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Preview — {rows.length} rows detected</h2>
            <button onClick={() => setStep('upload')} className="text-sm text-neutral-400 hover:text-neutral-700">← Re-upload</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-neutral-500">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {headers.map((h) => <td key={h} className="px-3 py-2 text-neutral-700">{row[h] || <span className="text-neutral-300">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && <p className="text-xs text-neutral-400">Showing first 5 of {rows.length} rows</p>}
          <div className="flex justify-end gap-3">
            <button onClick={reset} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
            <button onClick={handleImport} disabled={pending}
              className="rounded-lg bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center space-y-3">
          <p className="text-3xl">✓</p>
          <p className="text-lg font-semibold text-green-800">Import complete!</p>
          <p className="text-green-700">{importedCount} {importType} imported successfully.</p>
          <div className="flex justify-center gap-3 mt-4">
            {importType === 'contacts' && <a href="/dashboard/crm" className="rounded-lg border border-green-300 px-4 py-2 text-sm text-green-800 hover:bg-green-100">View Contacts</a>}
            {importType === 'products' && <a href="/dashboard/inventory" className="rounded-lg border border-green-300 px-4 py-2 text-sm text-green-800 hover:bg-green-100">View Inventory</a>}
            {importType === 'employees' && <a href="/dashboard/hr" className="rounded-lg border border-green-300 px-4 py-2 text-sm text-green-800 hover:bg-green-100">View HR</a>}
            <button onClick={reset} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">Import More</button>
          </div>
        </div>
      )}
    </div>
  );
}
