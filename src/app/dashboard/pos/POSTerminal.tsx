'use client';

import { useState, useMemo } from 'react';

type Product = { id: string; name: string; sku: string; unit_price: number; gst_rate: number; stock_qty: number; category?: string };
type CartItem = Product & { qty: number };

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function POSTerminal({ sessionId, products }: { sessionId: string; products: Product[] }) {
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [search, setSearch]         = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [payMethod, setPayMethod]   = useState<'cash'|'upi'|'card'>('cash');
  const [tendered, setTendered]     = useState('');
  const [screen, setScreen]         = useState<'pos'|'tender'|'receipt'>('pos');
  const [lastOrder, setLastOrder]   = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string|null>(null);

  const filtered = useMemo(() =>
    products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())),
    [products, search]);

  const subtotal   = cart.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const gstAmount  = cart.reduce((s, i) => s + i.unit_price * i.qty * (i.gst_rate / 100), 0);
  const total      = subtotal + gstAmount;
  const tenderedN  = parseFloat(tendered) || 0;
  const change     = tenderedN - total;

  function addToCart(p: Product) {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1 }];
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) setCart((c) => c.filter((i) => i.id !== id));
    else setCart((c) => c.map((i) => i.id === id ? { ...i, qty } : i));
  }

  async function checkout() {
    if (!cart.length) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/pos/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId, table_label: tableLabel || undefined,
        payment_method: payMethod, amount_tendered: payMethod === 'cash' ? tenderedN : total,
        items: cart.map((i) => ({ product_id: i.id, description: i.name, quantity: i.qty, unit_price: i.unit_price, gst_rate: i.gst_rate })),
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setLastOrder({ ...data, cart: [...cart], subtotal, gstAmount, total, payMethod, tableLabel });
    setCart([]); setTendered(''); setScreen('receipt'); setLoading(false);
  }

  if (screen === 'receipt' && lastOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 w-full max-w-sm text-center space-y-3">
          <div className="text-4xl">✓</div>
          <p className="text-lg font-bold">{lastOrder.order_number}</p>
          {lastOrder.tableLabel && <p className="text-sm text-neutral-500">Table: {lastOrder.tableLabel}</p>}
          <div className="text-left rounded-xl bg-white border border-green-100 p-4 text-sm space-y-1">
            {lastOrder.cart.map((i: CartItem) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.name} ×{i.qty}</span>
                <span>{fmt(i.unit_price * i.qty)}</span>
              </div>
            ))}
            <div className="border-t border-green-100 mt-2 pt-2 flex justify-between font-semibold">
              <span>Total</span><span>{fmt(lastOrder.total)}</span>
            </div>
            {lastOrder.payMethod === 'cash' && (
              <>
                <div className="flex justify-between text-neutral-500"><span>Tendered</span><span>{fmt(tenderedN || lastOrder.total)}</span></div>
                <div className="flex justify-between font-semibold text-green-700"><span>Change</span><span>{fmt(lastOrder.change_amount)}</span></div>
              </>
            )}
          </div>
          <p className="text-sm text-neutral-500 capitalize">Paid by {lastOrder.payMethod}</p>
        </div>
        <button onClick={() => setScreen('pos')} className="rounded-xl bg-neutral-900 px-8 py-3 text-white font-medium">
          New Order
        </button>
        <button onClick={() => window.print()} className="text-sm text-neutral-500 hover:text-neutral-900">Print Receipt</button>
      </div>
    );
  }

  if (screen === 'tender') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-6 max-w-sm mx-auto">
        <h2 className="text-2xl font-bold">Checkout</h2>
        <div className="w-full rounded-xl border border-neutral-200 bg-white p-6 text-center">
          <p className="text-neutral-500 text-sm">Total Amount</p>
          <p className="text-4xl font-bold mt-1">{fmt(total)}</p>
        </div>
        <div className="w-full space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['cash','upi','card'] as const).map((m) => (
              <button key={m} onClick={() => setPayMethod(m)}
                className={`rounded-xl border py-3 text-sm font-medium capitalize ${payMethod === m ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                {m === 'upi' ? 'UPI' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {payMethod === 'cash' && (
            <div>
              <label className="text-sm text-neutral-600">Cash Tendered</label>
              <input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-lg text-right focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              {tenderedN >= total && (
                <p className="mt-1 text-right text-green-600 font-medium">Change: {fmt(Math.max(0, change))}</p>
              )}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex w-full gap-3">
          <button onClick={() => setScreen('pos')} className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm">Back</button>
          <button onClick={checkout} disabled={loading || (payMethod === 'cash' && tenderedN < total && tenderedN > 0)}
            className="flex-[2] rounded-xl bg-neutral-900 py-3 text-white font-medium disabled:opacity-50">
            {loading ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Product grid */}
      <div className="flex-1 flex flex-col gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
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
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-neutral-400 text-sm">No products found</div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="w-80 flex flex-col rounded-2xl border border-neutral-200 bg-white">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)}
              placeholder="Table / Name (optional)"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Cart is empty</p>
          ) : cart.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-neutral-400">{fmt(item.unit_price)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded text-neutral-500 hover:bg-neutral-200 flex items-center justify-center text-sm">−</button>
                <span className="w-6 text-center text-sm">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded text-neutral-500 hover:bg-neutral-200 flex items-center justify-center text-sm">+</button>
              </div>
              <span className="text-sm font-medium w-16 text-right">{fmt(item.unit_price * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-neutral-100 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-neutral-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-neutral-500"><span>GST</span><span>{fmt(gstAmount)}</span></div>
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <button onClick={() => setScreen('tender')} disabled={!cart.length}
            className="w-full rounded-xl bg-neutral-900 py-3 text-white font-medium disabled:opacity-30">
            Charge {cart.length > 0 ? fmt(total) : ''}
          </button>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="w-full text-xs text-neutral-400 hover:text-neutral-700">Clear cart</button>
          )}
        </div>
      </div>
    </div>
  );
}
