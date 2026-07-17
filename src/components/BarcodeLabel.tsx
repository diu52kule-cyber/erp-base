'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

// A single printable product label: name, price, an optional offer badge, and a
// real Code128 barcode. Quiet zones (margins) are required on both sides of a
// Code128 symbol or scanners can't lock onto the start/stop bars — that's what
// the generous marginLeft/marginRight below give.
export default function BarcodeLabel({ name, price, code, offer, showQr = false }:
  { name: string; price: number; code: string; offer?: string | null; showQr?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 13,
        textMargin: 2,
        height: 46,
        width: 1.6,
        margin: 6,
        marginLeft: 16,   // quiet zone (left)
        marginRight: 16,  // quiet zone (right)
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch { /* invalid code → leave blank */ }
  }, [code]);

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(code)}`;

  return (
    <div className="label-card inline-flex flex-col items-center gap-0.5 bg-white px-3 py-2 text-center text-black" style={{ minWidth: '50mm' }}>
      <div className="w-full truncate text-[11px] font-semibold leading-tight">{name}</div>
      <div className="text-[12px] font-bold">{fmt(price)}</div>
      {offer && <div className="rounded bg-black px-1.5 text-[10px] font-bold leading-tight text-white">{offer}</div>}
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
