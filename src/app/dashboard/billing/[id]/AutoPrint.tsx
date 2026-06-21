'use client';
import { useEffect } from 'react';

// Triggers the browser print dialog once when arriving via "Save & Print".
export default function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [enabled]);
  return null;
}
