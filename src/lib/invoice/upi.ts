import QRCode from 'qrcode';

// Build a UPI deep-link / QR payload (NPCI UPI URI spec).
export function upiUri(upiId: string, name: string, amount?: number, note?: string): string {
  const params = new URLSearchParams({ pa: upiId, pn: name, cu: 'INR' });
  if (amount && amount > 0) params.set('am', amount.toFixed(2));
  if (note) params.set('tn', note.slice(0, 50));
  return `upi://pay?${params.toString()}`;
}

export async function upiQrDataUrl(uri: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  } catch {
    return null;
  }
}
