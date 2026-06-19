'use client';
import { useEffect, useState } from 'react';

const FONTS = [
  { key: 'system', label: 'System', stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { key: 'inter',  label: 'Inter',  stack: '"Inter", sans-serif' },
  { key: 'poppins',label: 'Poppins',stack: '"Poppins", sans-serif' },
  { key: 'lora',   label: 'Lora (serif)', stack: '"Lora", Georgia, serif' },
  { key: 'mono',   label: 'Mono',   stack: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace' },
];

const SIZES = [
  { key: 'compact', label: 'Compact', px: '15px' },
  { key: 'default', label: 'Default', px: '16px' },
  { key: 'large',   label: 'Large',   px: '17px' },
  { key: 'xl',      label: 'Extra large', px: '18px' },
];

const THEMES = [
  { key: 'light',  label: 'Light' },
  { key: 'dark',   label: 'Dark' },
  { key: 'system', label: 'System' },
];

export default function PreferencesClient() {
  const [font, setFont] = useState('system');
  const [size, setSize] = useState('default');
  const [theme, setTheme] = useState('system');

  // Load current values from what's applied / stored
  useEffect(() => {
    const storedFont = localStorage.getItem('app-font');
    const f = FONTS.find((x) => x.stack === storedFont);
    if (f) setFont(f.key);
    const storedSize = localStorage.getItem('app-font-size');
    const s = SIZES.find((x) => x.px === storedSize);
    if (s) setSize(s.key);
    const t = localStorage.getItem('theme');
    setTheme(t === 'dark' ? 'dark' : t === 'light' ? 'light' : 'system');
  }, []);

  function applyFont(key: string) {
    setFont(key);
    const f = FONTS.find((x) => x.key === key)!;
    localStorage.setItem('app-font', f.stack);
    document.documentElement.style.setProperty('--app-font', f.stack);
  }
  function applySize(key: string) {
    setSize(key);
    const s = SIZES.find((x) => x.key === key)!;
    localStorage.setItem('app-font-size', s.px);
    document.documentElement.style.setProperty('--app-font-size', s.px);
  }
  function applyTheme(key: string) {
    setTheme(key);
    const d = document.documentElement;
    if (key === 'system') {
      localStorage.removeItem('theme');
      d.classList.toggle('dark', window.matchMedia('(prefers-color-scheme:dark)').matches);
    } else {
      localStorage.setItem('theme', key);
      d.classList.toggle('dark', key === 'dark');
    }
  }
  function reset() {
    localStorage.removeItem('app-font');
    localStorage.removeItem('app-font-size');
    localStorage.removeItem('theme');
    document.documentElement.style.removeProperty('--app-font');
    document.documentElement.style.removeProperty('--app-font-size');
    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme:dark)').matches);
    setFont('system'); setSize('default'); setTheme('system');
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Theme */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm">Appearance</h2>
        <p className="text-xs text-neutral-400 mb-3">Light, dark, or follow your device.</p>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button key={t.key} onClick={() => applyTheme(t.key)}
              className={`rounded-lg border px-4 py-2 text-sm transition-all ${theme === t.key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Font family */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm">Font</h2>
        <p className="text-xs text-neutral-400 mb-3">Applies across the whole app.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FONTS.map((f) => (
            <button key={f.key} onClick={() => applyFont(f.key)} style={{ fontFamily: f.stack }}
              className={`rounded-lg border px-4 py-3 text-left transition-all ${font === f.key ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}>
              <div className="text-sm font-medium">{f.label}</div>
              <div className="text-xs text-neutral-400">Aa Bb Cc 123</div>
            </button>
          ))}
        </div>
      </section>

      {/* Font size */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm">Text size</h2>
        <p className="text-xs text-neutral-400 mb-3">Scales the entire interface.</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button key={s.key} onClick={() => applySize(s.key)}
              className={`rounded-lg border px-4 py-2 text-sm transition-all ${size === s.key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-400'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Preview */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm mb-2">Preview</h2>
        <p className="text-neutral-700">The quick brown fox jumps over the lazy dog.</p>
        <p className="text-sm text-neutral-500 mt-1">Invoice INV-2026-0001 · ₹5,900 · Paid</p>
      </section>

      <button onClick={reset} className="text-sm text-neutral-500 hover:text-red-600">Reset to defaults</button>
    </div>
  );
}
