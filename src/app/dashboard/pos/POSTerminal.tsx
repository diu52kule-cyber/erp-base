'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

type Product = { id: string; name: string; sku: string; barcode?: string | null; unit_price: number; gst_rate: number; stock_qty: number; category?: string | null; tax_inclusive?: boolean };
type CartItem = Product & { qty: number; discountPct: number };
type Tender = { method: 'cash' | 'upi' | 'card'; amount: string };
type ParkedCart = { id: number; label: string; items: CartItem[]; customerId: string; customerName: string; discType: 'percent' | 'flat'; discValue: string };
type Contact = { id: string; name: string; email?: string | null };

function fmt(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function r2(n: number) { return Math.round(n * 100) / 100; }

export default function POSTerminal({
  sessionId, products, contacts = [],
}: {
  sessionId: string;
  products: Product[];
  contacts?: Contact[];
}) {
  // ── Core state ────────────────────────────────────────────────────
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [tableLabel, setTableLabel] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');

  // ── Discounts ─────────────────────────────────────────────────────
  const [billDiscType, setBillDiscType] = useState<'percent' | 'flat'>('percent');
  const [billDiscValue, setBillDiscValue] = useState('');
  const [activeDiscItem, setActiveDiscItem] = useState<string | null>(null);

  // ── Hold / Park ───────────────────────────────────────────────────
  const [parked, setParked] = useState<ParkedCart[]>([]);
  let parkSeq = useRef(0);

  // ── Split tender ──────────────────────────────────────────────────
  const [tenders, setTenders]     = useState<Tender[]>([{ method: 'cash', amount: '' }]);

  // ── Screen & last order ───────────────────────────────────────────
  const [screen, setScreen]       = useState<'pos' | 'tender' | 'receipt' | 'return'>('pos');
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── Loyalty ───────────────────────────────────────────────────────
  const [loyaltyBalance, setLoyaltyBalance] = useState<number | null>(null);
  const [redeemPoints, setRedeemPoints]     = useState('');

  // ── Cash modal ────────────────────────────────────────────────────
  const [cashModal, setCashModal] = useState(false);
  const [cashType, setCashType]   = useState<'in' | 'out'>('in');
  const [cashAmt, setCashAmt]     = useState('');
  const [cashReason, setCashReason] = useState('');
  const [cashBusy, setCashBusy]   = useState(false);

  // ── Return flow ───────────────────────────────────────────────────
  const [returnOrders, setReturnOrders] = useState<any[]>([]);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [returnQtys, setReturnQtys]     = useState<Record<string, number>>({});

  // ── Scanner ───────────────────────────────────────────────────────
  const [autoAdd, setAutoAdd]     = useState(true);
  const searchRef   = useRef<HTMLInputElement>(null);
  const lastKeyRef  = useRef(0);
  const fastRef     = useRef(0);
  const scanRef     = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { try { setAutoAdd(localStorage.getItem('pos-autoadd') !== '0'); } catch {} }, []);
  function toggleAuto() { setAutoAdd((a) => { const n = !a; try { localStorage.setItem('pos-autoadd', n ? '1' : '0'); } catch {} return n; }); }

  // Focus management
  useEffect(() => { if (screen === 'pos') searchRef.current?.focus(); }, [screen]);
  useEffect(() => { if (screen !== 'receipt') return; const h = (e: KeyboardEvent) => { if (e.key === 'Enter') newOrder(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [screen]);

  // ── Derived totals ────────────────────────────────────────────────
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);

  const filtered = useMemo(() => products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q);
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  }), [products, search, catFilter]);

  const lineAmounts = cart.map((i) => r2(i.qty * i.unit_price * (1 - i.discountPct / 100)));
  const lineGsts    = cart.map((i, idx) => r2(lineAmounts[idx] * i.gst_rate / 100));
  const subtotal    = r2(lineAmounts.reduce((s, a) => s + a, 0));
  const gstAmount   = r2(lineGsts.reduce((s, a) => s + a, 0));
  const grossTotal  = r2(subtotal + gstAmount);
  const billDiscNum = parseFloat(billDiscValue) || 0;
  const billDiscAmt = r2(billDiscType === 'percent' ? grossTotal * billDiscNum / 100 : Math.min(billDiscNum, grossTotal));
  const total       = r2(Math.max(0, grossTotal - billDiscAmt));

  const redeemPts     = Math.min(Math.floor(parseFloat(redeemPoints) || 0), loyaltyBalance ?? 0);
  const loyaltyDiscAmt = r2(redeemPts / 10); // 10 points = ₹1
  const finalTotal    = r2(Math.max(0, total - loyaltyDiscAmt));

  const tenderedTotal = r2(tenders.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0));
  const remaining     = r2(finalTotal - tenderedTotal);
  const cashTendered  = tenders.find((t) => t.method === 'cash');
  const change        = tenders.length === 1 && cashTendered ? r2((parseFloat(cashTendered.amount) || 0) - finalTotal) : 0;

  // ── Scanner helpers ───────────────────────────────────────────────
  function exactMatch(q: string): Product | null {
    const s = q.trim().toLowerCase();
    return products.find((p) => (p.barcode ?? '').toLowerCase() === s)
        ?? products.find((p) => (p.sku ?? '').toLowerCase() === s) ?? null;
  }
  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (autoAdd && scanRef.current && v.trim()) { const m = exactMatch(v); if (m) { addToCart(m); setSearch(''); } }
      scanRef.current = false; fastRef.current = 0;
    }, 90);
  }
  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now(), gap = now - lastKeyRef.current; lastKeyRef.current = now;
    if (e.key.length === 1) { if (gap < 35) { fastRef.current++; if (fastRef.current >= 2) scanRef.current = true; } else fastRef.current = 0; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (timerRef.current) clearTimeout(timerRef.current);
      const q = search.trim();
      if (q) { const pick = exactMatch(q) ?? filtered[0]; if (pick) { addToCart(pick); setSearch(''); } }
      else if (cart.length) goToTender();
      scanRef.current = false; fastRef.current = 0;
    } else if (e.key === 'Escape') { setSearch(''); scanRef.current = false; fastRef.current = 0; }
  }

  // ── Cart actions ──────────────────────────────────────────────────
  function addToCart(p: Product) {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1, discountPct: 0 }];
    });
  }
  function updateQty(id: string, qty: number) {
    if (qty <= 0) { setCart((c) => c.filter((i) => i.id !== id)); setActiveDiscItem(null); }
    else setCart((c) => c.map((i) => i.id === id ? { ...i, qty } : i));
  }
  function updateItemDisc(id: string, pct: number) {
    setCart((c) => c.map((i) => i.id === id ? { ...i, discountPct: Math.min(100, Math.max(0, pct)) } : i));
  }
  function clearCart() { setCart([]); setBillDiscValue(''); setCustomerId(''); setCustomerName(''); setTableLabel(''); setActiveDiscItem(null); }

  // ── Hold / Park ───────────────────────────────────────────────────
  function parkBill() {
    if (!cart.length) return;
    parkSeq.current++;
    const newPark: ParkedCart = { id: parkSeq.current, label: tableLabel || `Bill ${parkSeq.current}`, items: [...cart], customerId, customerName, discType: billDiscType, discValue: billDiscValue };
    setParked((p) => [...p.slice(-4), newPark]);
    clearCart();
  }
  function restoreBill(pk: ParkedCart) {
    if (cart.length) { if (!confirm(`Replace current cart with "${pk.label}"?`)) return; }
    setCart(pk.items);
    setTableLabel(pk.label);
    setCustomerId(pk.customerId);
    setCustomerName(pk.customerName);
    setBillDiscType(pk.discType);
    setBillDiscValue(pk.discValue);
    setParked((p) => p.filter((x) => x.id !== pk.id));
  }

  // ── Tender helpers ────────────────────────────────────────────────
  async function goToTender() {
    setRedeemPoints('');
    setLoyaltyBalance(null);
    setTenders([{ method: 'cash', amount: total.toFixed(2) }]);
    setError(null);
    setScreen('tender');
    if (customerId) {
      try {
        const res = await fetch(`/api/loyalty?contact_id=${customerId}`);
        const data = await res.json();
        const bal = Array.isArray(data) ? (data[0]?.points ?? 0) : 0;
        setLoyaltyBalance(bal);
      } catch { /* loyalty tables not yet run */ }
    }
  }
  function addTender() { setTenders((t) => [...t, { method: 'upi', amount: remaining > 0 ? remaining.toFixed(2) : '' }]); }
  function removeTender(i: number) { setTenders((t) => t.filter((_, idx) => idx !== i)); }
  function updateTender(i: number, field: 'method' | 'amount', val: string) {
    setTenders((t) => t.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  }

  // ── Checkout ──────────────────────────────────────────────────────
  async function checkout() {
    if (!cart.length) return;
    if (remaining > 0.01) { setError(`Still ₹${remaining.toFixed(2)} unpaid`); return; }
    setLoading(true); setError(null);
    const splitTenders = tenders.length > 1 ? tenders.map((t) => ({ method: t.method, amount: parseFloat(t.amount) || 0 })) : null;
    const singleMethod = tenders[0]?.method ?? 'cash';
    const totalDiscAmt = r2(billDiscAmt + loyaltyDiscAmt);
    const res = await fetch('/api/pos/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId, table_label: tableLabel || undefined,
        customer_id: customerId || undefined,
        customer_name: customerName || undefined,
        payment_method: splitTenders ? 'split' : singleMethod,
        split_tenders: splitTenders,
        amount_tendered: splitTenders ? tenderedTotal : (parseFloat(tenders[0]?.amount || '') || finalTotal),
        discount_type: totalDiscAmt > 0 ? billDiscType : undefined,
        discount_value: totalDiscAmt > 0 ? billDiscNum : 0,
        discount_amount: totalDiscAmt,
        items: cart.map((i) => ({
          product_id: i.id, description: i.name, quantity: i.qty,
          unit_price: i.unit_price, gst_rate: i.gst_rate, discount_pct: i.discountPct,
        })),
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }

    // Redeem loyalty points if used
    if (customerId && redeemPts > 0) {
      try {
        await fetch('/api/loyalty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: customerId, points: redeemPts, type: 'redeem',
            reference_id: data.id, reference_type: 'pos_order',
          }),
        });
      } catch { /* silently skip */ }
    }

    // Earn loyalty points (1 pt per ₹10 of finalTotal)
    let pointsEarned = 0;
    if (customerId) {
      pointsEarned = Math.floor(finalTotal / 10);
      if (pointsEarned > 0) {
        try {
          await fetch('/api/loyalty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: customerId, points: pointsEarned, type: 'earn',
              reference_id: data.id, reference_type: 'pos_order',
            }),
          });
        } catch { /* loyalty not yet activated — silently skip */ }
      }
    }

    setLastOrder({ ...data, cart: [...cart], subtotal, gstAmount, billDiscAmt: totalDiscAmt, total: finalTotal, tenders: [...tenders], tableLabel, customerName, pointsEarned, redeemPts });
    clearCart(); setRedeemPoints(''); setLoyaltyBalance(null); setScreen('receipt'); setLoading(false);
  }

  // ── New order ─────────────────────────────────────────────────────
  function newOrder() { setScreen('pos'); setTenders([{ method: 'cash', amount: '' }]); }

  // ── Cash in/out ───────────────────────────────────────────────────
  async function submitCash() {
    if (!cashAmt || parseFloat(cashAmt) <= 0) return;
    setCashBusy(true);
    const res = await fetch(`/api/pos/sessions/${sessionId}/cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: cashType, amount: parseFloat(cashAmt), reason: cashReason }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else { setCashModal(false); setCashAmt(''); setCashReason(''); }
    setCashBusy(false);
  }

  // ── Return flow ───────────────────────────────────────────────────
  async function openReturn() {
    const res = await fetch(`/api/pos/orders?session_id=${sessionId}`);
    const data = await res.json();
    setReturnOrders((data ?? []).filter((o: any) => o.order_type !== 'refund'));
    setReturnTarget(null); setReturnQtys({});
    setScreen('return');
  }
  async function fetchReturnOrder(orderId: string) {
    const res = await fetch(`/api/pos/sessions/${sessionId}`);
    const data = await res.json();
    const ord = (data.orders ?? []).find((o: any) => o.id === orderId);
    setReturnTarget(ord ?? null);
    if (ord) setReturnQtys(Object.fromEntries((ord.pos_order_lines ?? []).map((l: any) => [l.id, l.quantity])));
  }
  async function processReturn() {
    if (!returnTarget) return;
    const lines = (returnTarget.pos_order_lines ?? []).map((l: any) => ({
      product_id: l.product_id, description: l.description,
      quantity: returnQtys[l.id] ?? l.quantity,
      unit_price: l.unit_price, gst_rate: l.gst_rate,
    })).filter((l: any) => l.quantity > 0);
    if (!lines.length) return;
    setLoading(true);
    const res = await fetch('/api/pos/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId, order_type: 'refund',
        refund_of_order_id: returnTarget.id,
        payment_method: returnTarget.payment_method,
        items: lines,
      }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); setLoading(false); return; }
    setLastOrder({ ...data, cart: lines.map((l: any) => ({ ...l, name: l.description })), subtotal: 0, gstAmount: 0, billDiscAmt: 0, total: data.total, tenders: [], tableLabel: '', customerName: '', isRefund: true });
    setScreen('receipt'); setLoading(false);
  }

  const inputCls = 'rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900';

  // ═══════════════════════════════════════════════════════════════════
  // RECEIPT SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'receipt' && lastOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-4">
        <div className={`rounded-2xl border p-8 w-full max-w-sm text-center space-y-3 ${lastOrder.isRefund ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className="text-4xl">{lastOrder.isRefund ? '↩' : '✓'}</div>
          <p className="text-lg font-bold">{lastOrder.order_number}</p>
          {lastOrder.isRefund && <p className="text-sm font-medium text-red-600">REFUND</p>}
          {lastOrder.tableLabel && <p className="text-sm text-neutral-500">Table: {lastOrder.tableLabel}</p>}
          {lastOrder.customerName && <p className="text-sm text-neutral-500">Customer: {lastOrder.customerName}</p>}
          {(lastOrder.pointsEarned > 0 || lastOrder.redeemPts > 0) && (
            <div className="space-y-1">
              {lastOrder.redeemPts > 0 && (
                <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-3 py-1 inline-block">
                  −{lastOrder.redeemPts} pts redeemed (−{fmt(lastOrder.redeemPts / 10)})
                </p>
              )}
              {lastOrder.pointsEarned > 0 && (
                <p className="text-xs font-medium text-green-700 bg-green-50 rounded-lg px-3 py-1 inline-block">
                  +{lastOrder.pointsEarned} loyalty points earned
                </p>
              )}
            </div>
          )}
          <div className="text-left rounded-xl bg-white border border-green-100 p-4 text-sm space-y-1">
            {lastOrder.cart.map((i: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <span>{i.name || i.description} ×{i.qty || i.quantity}</span>
                <span>{fmt((i.qty || i.quantity) * i.unit_price)}</span>
              </div>
            ))}
            {lastOrder.billDiscAmt > 0 && (
              <div className="flex justify-between text-amber-600"><span>Discount</span><span>−{fmt(lastOrder.billDiscAmt)}</span></div>
            )}
            <div className="border-t border-green-100 mt-2 pt-2 flex justify-between font-semibold">
              <span>Total</span><span>{lastOrder.isRefund ? '−' : ''}{fmt(Math.abs(lastOrder.total))}</span>
            </div>
            {change > 0 && !lastOrder.isRefund && (
              <div className="flex justify-between font-semibold text-green-700"><span>Change</span><span>{fmt(change)}</span></div>
            )}
          </div>
        </div>
        <button onClick={newOrder} className="rounded-xl bg-neutral-900 px-8 py-3 text-white font-medium">New Order</button>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="text-sm text-neutral-500 hover:text-neutral-900">Print Receipt</button>
          {!lastOrder.isRefund && (
            <SMSReceiptButton orderId={lastOrder.id} orderNumber={lastOrder.order_number} total={lastOrder.total} customerName={lastOrder.customerName} />
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RETURN SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'return') {
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('pos')} className="text-sm text-neutral-500 hover:text-neutral-900">← Back</button>
          <h2 className="text-xl font-semibold">Process Return / Refund</h2>
        </div>
        {!returnTarget ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
            <p className="text-sm text-neutral-500">Select a sale from this session to refund:</p>
            {returnOrders.length === 0 ? (
              <p className="text-sm text-neutral-400">No eligible sales in this session.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {returnOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-mono text-sm font-medium">{o.order_number}</p>
                      {(o.contacts as any)?.name && <p className="text-xs text-neutral-400">{(o.contacts as any).name}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{fmt(o.total)}</span>
                      <button onClick={() => fetchReturnOrder(o.id)} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50">Select</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{returnTarget.order_number}</h3>
              <button onClick={() => setReturnTarget(null)} className="text-xs text-neutral-400 hover:text-neutral-700">Change order</button>
            </div>
            <p className="text-xs text-neutral-400">Adjust qty to 0 to exclude an item.</p>
            <div className="space-y-2">
              {(returnTarget.pos_order_lines ?? []).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm flex-1">{l.description}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setReturnQtys((q) => ({ ...q, [l.id]: Math.max(0, (q[l.id] ?? l.quantity) - 1) }))} className="h-7 w-7 rounded border border-neutral-200 text-sm flex items-center justify-center hover:bg-neutral-50">−</button>
                    <span className="w-8 text-center text-sm">{returnQtys[l.id] ?? l.quantity}</span>
                    <button onClick={() => setReturnQtys((q) => ({ ...q, [l.id]: Math.min(l.quantity, (q[l.id] ?? l.quantity) + 1) }))} className="h-7 w-7 rounded border border-neutral-200 text-sm flex items-center justify-center hover:bg-neutral-50">+</button>
                    <span className="w-20 text-right text-sm text-neutral-500">{fmt(l.unit_price * (returnQtys[l.id] ?? l.quantity))}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={processReturn} disabled={loading} className="w-full rounded-xl bg-red-600 py-3 text-white font-medium hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Processing…' : 'Process Refund'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TENDER SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'tender') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-5 max-w-sm mx-auto">
        <h2 className="text-2xl font-bold">Checkout</h2>
        <div className="w-full rounded-xl border border-neutral-200 bg-white p-5 text-center">
          <p className="text-neutral-500 text-sm">Total Amount</p>
          <p className="text-4xl font-bold mt-1">{fmt(finalTotal)}</p>
          {billDiscAmt > 0 && <p className="text-xs text-amber-600 mt-1">Discount: −{fmt(billDiscAmt)}</p>}
          {loyaltyDiscAmt > 0 && <p className="text-xs text-amber-700 mt-0.5">Loyalty redeem: −{fmt(loyaltyDiscAmt)}</p>}
          {customerName && <p className="text-xs text-neutral-400 mt-1">{customerName}</p>}
        </div>

        {/* Loyalty redemption */}
        {customerId && loyaltyBalance !== null && loyaltyBalance > 0 && (
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-800">Loyalty Points</p>
              <span className="text-sm font-bold text-amber-700">{loyaltyBalance} pts available</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={redeemPoints}
                onChange={(e) => {
                  const v = Math.min(parseInt(e.target.value) || 0, loyaltyBalance);
                  setRedeemPoints(v > 0 ? String(v) : '');
                  const newTotal = r2(Math.max(0, total - v / 10));
                  setTenders([{ method: tenders[0]?.method ?? 'cash', amount: newTotal.toFixed(2) }]);
                }}
                placeholder="Points to redeem"
                min={0}
                max={loyaltyBalance}
                className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm focus:outline-none"
              />
              <button
                onClick={() => {
                  const maxPts = Math.min(loyaltyBalance, Math.floor(total * 10));
                  setRedeemPoints(String(maxPts));
                  const newTotal = r2(Math.max(0, total - maxPts / 10));
                  setTenders([{ method: tenders[0]?.method ?? 'cash', amount: newTotal.toFixed(2) }]);
                }}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
              >
                Use all
              </button>
            </div>
            <p className="text-xs text-amber-600">10 pts = ₹1 discount</p>
          </div>
        )}

        <div className="w-full space-y-3">
          {tenders.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={t.method}
                onChange={(e) => updateTender(i, 'method', e.target.value)}
                className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none"
              >
                {(['cash','upi','card'] as const).map((m) => <option key={m} value={m}>{m === 'upi' ? 'UPI' : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
              <input
                type="number"
                value={t.amount}
                onChange={(e) => updateTender(i, 'amount', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && remaining <= 0.01) checkout(); if (e.key === 'Escape') setScreen('pos'); }}
                placeholder="0.00"
                className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-lg text-right focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button onClick={() => updateTender(i, 'amount', (i === 0 ? total : remaining > 0 ? remaining : 0).toFixed(2))} className={`text-xs px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-50 ${i === 0 ? 'w-12' : 'w-12'}`}>
                {i === 0 ? 'Full' : 'Rem.'}
              </button>
              {tenders.length > 1 && (
                <button onClick={() => removeTender(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
              )}
            </div>
          ))}

          {tenders.length < 3 && remaining > 0.01 && (
            <button onClick={addTender} className="text-sm text-neutral-500 hover:text-neutral-900 underline">+ Add another payment method</button>
          )}

          {tenders.length === 1 && tenders[0].method === 'cash' && change > 0 && (
            <p className="text-right text-green-600 font-medium text-sm">Change: {fmt(change)}</p>
          )}
          {remaining > 0.01 && tenderedTotal > 0 && (
            <p className="text-right text-amber-600 font-medium text-sm">Remaining: {fmt(remaining)}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div className="flex w-full gap-3">
          <button onClick={() => setScreen('pos')} className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm">Back</button>
          <button
            onClick={checkout}
            disabled={loading || remaining > 0.01}
            className="flex-[2] rounded-xl bg-neutral-900 py-3 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN POS SCREEN
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-260px)] min-h-[480px]">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search or scan barcode… (Enter charges)"
          autoFocus
          className="flex-1 min-w-0 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-neutral-500">
          <input type="checkbox" checked={autoAdd} onChange={toggleAuto} className="h-3.5 w-3.5" />Auto-scan
        </label>
        <button onClick={parkBill} disabled={!cart.length || parked.length >= 5}
          className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed">
          Hold Bill{parked.length > 0 ? ` (${parked.length})` : ''}
        </button>
        <button onClick={openReturn} className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Return ↩</button>
        <button onClick={() => setCashModal(true)} className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Cash ±</button>
        {lastOrder && <button onClick={() => setScreen('receipt')} className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 text-neutral-400">Last receipt</button>}
      </div>

      {/* Parked bills */}
      {parked.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-neutral-400 self-center">Parked:</span>
          {parked.map((pk) => (
            <button key={pk.id} onClick={() => restoreBill(pk)}
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100">
              {pk.label} · {fmt(pk.items.reduce((s, i) => s + i.unit_price * i.qty, 0))}
            </button>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setCatFilter('')} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${!catFilter ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}>All</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c!)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${catFilter === c ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}>{c}</button>
          ))}
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Product grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => addToCart(p)}
              className="rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-neutral-400 hover:shadow-sm transition-all">
              <p className="font-medium text-sm leading-tight">{p.name}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{p.sku}</p>
              <p className="mt-2 text-base font-bold">{fmt(p.unit_price)}</p>
              {p.gst_rate > 0 && <p className="text-xs text-neutral-400">+{p.gst_rate}% GST</p>}
              <p className="text-xs text-neutral-400 mt-1">Stock: {p.stock_qty}</p>
            </button>
          ))}
          {filtered.length === 0 && <div className="col-span-full py-12 text-center text-neutral-400 text-sm">No products found</div>}
        </div>

        {/* Cart */}
        <div className="w-80 flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          {/* Customer + table */}
          <div className="p-3 border-b border-neutral-100 space-y-2">
            <input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)}
              placeholder="Table / Label (optional)"
              className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none" />
            <div className="relative">
              <input
                list="pos-contacts"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  const c = contacts.find((x) => x.name === e.target.value);
                  setCustomerId(c?.id ?? '');
                }}
                placeholder="Customer (optional)"
                className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none"
              />
              <datalist id="pos-contacts">
                {contacts.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
              {customerName && <button onClick={() => { setCustomerName(''); setCustomerId(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs">×</button>}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">Cart is empty</p>
            ) : cart.map((item) => (
              <div key={item.id}>
                <div className="flex items-center gap-1.5 rounded-lg bg-neutral-50 px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{item.name}</p>
                    <p className="text-xs text-neutral-400">{fmt(item.unit_price)} each</p>
                  </div>
                  {/* Discount chip */}
                  {activeDiscItem === item.id ? (
                    <input
                      type="number"
                      value={item.discountPct || ''}
                      onChange={(e) => updateItemDisc(item.id, parseFloat(e.target.value) || 0)}
                      onBlur={() => setActiveDiscItem(null)}
                      autoFocus
                      min="0" max="100" step="1"
                      placeholder="0"
                      className="w-14 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-right focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setActiveDiscItem(item.id)}
                      className={`text-xs px-1.5 py-0.5 rounded ${item.discountPct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-400'} hover:bg-amber-100 hover:text-amber-700`}
                    >
                      {item.discountPct > 0 ? `${item.discountPct}%` : '%'}
                    </button>
                  )}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded text-neutral-500 hover:bg-neutral-200 flex items-center justify-center text-sm">−</button>
                    <span className="w-5 text-center text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded text-neutral-500 hover:bg-neutral-200 flex items-center justify-center text-sm">+</button>
                  </div>
                  <span className="text-sm font-medium w-14 text-right shrink-0">{fmt(item.unit_price * item.qty * (1 - item.discountPct / 100))}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals + actions */}
          <div className="p-3 border-t border-neutral-100 space-y-2.5">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-neutral-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-neutral-500"><span>GST</span><span>{fmt(gstAmount)}</span></div>
              {/* Bill discount */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 text-sm flex-1">Discount</span>
                <select value={billDiscType} onChange={(e) => setBillDiscType(e.target.value as 'percent' | 'flat')} className="rounded border border-neutral-200 text-xs px-1 py-0.5">
                  <option value="percent">%</option>
                  <option value="flat">₹</option>
                </select>
                <input
                  type="number"
                  value={billDiscValue}
                  onChange={(e) => setBillDiscValue(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-16 rounded border border-neutral-200 text-xs px-1.5 py-0.5 text-right focus:outline-none"
                />
                {billDiscAmt > 0 && <span className="text-xs text-amber-600 w-14 text-right">−{fmt(billDiscAmt)}</span>}
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-neutral-100"><span>Total</span><span>{fmt(total)}</span></div>
            </div>

            <div className="flex gap-2">
              <button onClick={goToTender} disabled={!cart.length}
                className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-white font-medium disabled:opacity-30 text-sm">
                Charge {cart.length > 0 ? fmt(total) : ''}
              </button>
              {cart.length > 0 && (
                <button onClick={clearCart} className="rounded-lg border border-neutral-200 px-3 py-2.5 text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50">Clear</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cash in/out modal */}
      {cashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg">Cash In / Out</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['in', 'out'] as const).map((t) => (
                <button key={t} onClick={() => setCashType(t)}
                  className={`rounded-lg border py-2 text-sm font-medium ${cashType === t ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                  Cash {t === 'in' ? 'In (+)' : 'Out (−)'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-neutral-600">Amount (₹)</label>
              <input type="number" value={cashAmt} onChange={(e) => setCashAmt(e.target.value)} min="0" step="0.01" placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-lg text-right focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="text-sm text-neutral-600">Reason (optional)</label>
              <input type="text" value={cashReason} onChange={(e) => setCashReason(e.target.value)} placeholder="e.g. Tips, Petty cash"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCashModal(false)} className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={submitCash} disabled={cashBusy || !cashAmt || parseFloat(cashAmt) <= 0}
                className="flex-[2] rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
                {cashBusy ? '…' : `Record Cash ${cashType === 'in' ? 'In' : 'Out'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SMSReceiptButton({ orderId, orderNumber, total, customerName }: { orderId: string; orderNumber: string; total: number; customerName: string }) {
  const [phone, setPhone]   = useState('');
  const [open, setOpen]     = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);

  async function send() {
    if (!phone.trim()) return;
    setSending(true);
    const message = `Receipt: ${orderNumber}\nAmount: ₹${Math.abs(total).toFixed(2)}\n${customerName ? `Customer: ${customerName}\n` : ''}Thank you for your purchase!`;
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message, reference: orderId }),
    });
    const data = await res.json();
    if (data.ok) { setSent(true); setOpen(false); }
    else alert(data.error ?? 'Failed to send SMS');
    setSending(false);
  }

  if (sent) return <span className="text-xs text-green-600">SMS sent ✓</span>;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="text-sm text-neutral-500 hover:text-neutral-900">
        SMS Receipt
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-56 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg space-y-2">
          <p className="text-xs font-medium">Send SMS receipt</p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile number"
            className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none"
          />
          <button onClick={send} disabled={sending || !phone.trim()} className="w-full rounded-lg bg-neutral-900 py-1.5 text-xs text-white disabled:opacity-50">
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
