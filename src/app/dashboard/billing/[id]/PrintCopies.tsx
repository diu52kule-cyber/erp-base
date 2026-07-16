'use client';

import { useEffect } from 'react';

// When the org's invoice setting asks for more than one printed copy, override
// window.print() (used by the on-screen Print button and "Save & Print") to
// render the invoice N times into a hidden iframe with page breaks between them.
// One copy = normal browser print (handled by the page's print CSS).
export default function PrintCopies({ copies }: { copies: number }) {
  useEffect(() => {
    const n = Math.min(4, Math.max(1, Math.floor(copies) || 1));
    if (n <= 1) return;

    const original = window.print.bind(window);

    window.print = () => {
      const area = document.getElementById('invoice-print-area');
      if (!area) { original(); return; }

      const styles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style'),
      ).map((el) => el.outerHTML).join('');

      const sheet = area.outerHTML;
      const pages = Array.from({ length: n }, (_, i) =>
        `<div class="copy-sheet"${i ? ' style="break-before:page;page-break-before:always"' : ''}>${sheet}</div>`,
      ).join('');

      const override = `
        body{margin:0;padding:12px;background:#fff}
        .copy-sheet{padding:6px}
        @media print{
          body *{visibility:visible !important}
          #invoice-print-area{position:static !important;left:auto !important;top:auto !important;box-shadow:none !important;border:none !important;border-radius:0 !important}
          .copy-sheet{break-inside:avoid}
          .no-print{display:none !important}
        }`;

      const html =
        `<!doctype html><html><head><meta charset="utf-8">${styles}<style>${override}</style></head><body>${pages}</body></html>`;

      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) { iframe.remove(); original(); return; }
      doc.open(); doc.write(html); doc.close();

      window.setTimeout(() => {
        try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
        catch { original(); }
        window.setTimeout(() => iframe.remove(), 1500);
      }, 500);
    };

    return () => { window.print = original; };
  }, [copies]);

  return null;
}
