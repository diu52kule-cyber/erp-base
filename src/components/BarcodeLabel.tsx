'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

// A single printable product label: name, price, Code128 barcode + QR of the code.
export default function BarcodeLabel({ name, price, code, showQr = true }:
  { name: string; price: number; code: string; showQr?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 13,
        height: 44,
        margin: 0,
        width: 1.6,
      });
    } catch { /* invalid code → leave blank */ }
  }, [code]);

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(code)}`;

  return (
    <div className="label-card inline-flex flex-col items-center gap-1 bg-white px-3 py-2 text-center text-black" style={{ width: '50mm' }}>
      <div className="w-full truncate text-[11px] font-semibold leading-tight">{name}</div>
      <div className="text-[12px] font-bold">{fmt(price)}</div>
      <div className="flex items-center gap-2">
        <svg ref={svgRef} />
        {showQr && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrSrc} alt="QR" width={46} height={46} />
        )}
      </div>
    </div>
  );
}
