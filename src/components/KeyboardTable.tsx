'use client';
import { useEffect, useRef, useState } from 'react';

type Row = { id: string; href: string; editHref?: string };

export default function KeyboardTable<T extends Row>({
  rows,
  className,
  children,
}: {
  rows: T[];
  className?: string;
  children: (selectedId: string | null) => React.ReactNode;
}) {
  const [cursor, setCursor] = useState(-1);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    setCursor(-1);
  }, [rows.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).contentEditable === 'true') return;

      const len = rowsRef.current.length;
      if (len === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, len - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setCursor((c) => (c <= 0 ? 0 : c - 1));
      } else if ((e.key === 'Enter' || e.key === 'o') && cursor >= 0) {
        const row = rowsRef.current[cursor];
        if (row) { e.preventDefault(); window.location.href = row.href; }
      } else if (e.key === 'e' && cursor >= 0) {
        const row = rowsRef.current[cursor];
        if (row?.editHref) { e.preventDefault(); window.location.href = row.editHref; }
      } else if (e.key === 'Escape') {
        setCursor(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor]);

  return (
    <tbody className={className}>
      {children(cursor >= 0 && rows[cursor] ? rows[cursor].id : null)}
    </tbody>
  );
}
