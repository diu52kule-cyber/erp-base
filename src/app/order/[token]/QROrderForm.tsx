'use client';

import { useState } from 'react';

type Product = {
  id: string;
  name: string;
  selling_price: number;
  category: string | null;
  gst_rate: number;
  stock_qty: number;
};

type CartItem = {
  product_id: string;
  name: string;
  qty: number;
  price: number;
};

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function QROrderForm({
  token,
  tableName,
  products,
}: {
  token: string;
  tableName: string;
  products: Product[];
}) {
  const [cart, setCart]           = useState<Record<string, CartItem>>({});
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  function addToCart(p: Product) {
    setCart((prev) => ({
      ...prev,
      [p.id]: {
        product_id: p.id,
        name: p.name,
        qty: (prev[p.id]?.qty ?? 0) + 1,
        price: p.selling_price,
      },
    }));
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId]?.qty > 1) {
        updated[productId] = { ...updated[productId], qty: updated[productId].qty - 1 };
      } else {
        delete updated[productId];
      }
      return updated;
    });
  }

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Group products by category
  const categories: Record<string, Product[]> = {};
  for (const p of products) {
    const cat = p.category ?? 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  }

  async function placeOrder() {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/pos/qr-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_token: token,
        customer_name: customerName.trim() || null,
        items: cartItems,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) { setError(data.error); return; }
    setOrderId(data.id);
    setCart({});
  }

  if (orderId) {
    return (
      <div className="mt-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-semibold">Order Placed!</h2>
        <p className="text-neutral-500 text-sm">Your order has been sent to the kitchen. We&apos;ll bring it to Table {tableName} soon.</p>
        <p className="text-xs text-neutral-300 font-mono">#{orderId.slice(-8).toUpperCase()}</p>
        <button
          onClick={() => setOrderId(null)}
          className="mt-4 rounded-xl border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Order More
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Menu */}
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{cat}</p>
          {items.map((p) => {
            const inCart = cart[p.id];
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-sm text-neutral-500">{fmt(p.selling_price)}</p>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(p.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-lg hover:bg-neutral-50"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-medium text-sm">{inCart.qty}</span>
                    <button
                      onClick={() => addToCart(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-lg hover:bg-neutral-50"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(p)}
                    className="rounded-full border border-neutral-900 px-4 py-1.5 text-sm font-medium hover:bg-neutral-900 hover:text-white transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {products.length === 0 && (
        <p className="text-center text-neutral-400 text-sm py-12">Menu not available yet.</p>
      )}

      {/* Cart summary */}
      {cartItems.length > 0 && (
        <div className="sticky bottom-4 rounded-xl border border-neutral-900 bg-neutral-900 p-4 shadow-lg space-y-3">
          <div className="space-y-1">
            {cartItems.map((i) => (
              <div key={i.product_id} className="flex justify-between text-sm text-white">
                <span>{i.name} × {i.qty}</span>
                <span>{fmt(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-white border-t border-neutral-700 pt-1 mt-1">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
          <input
            placeholder="Your name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          <textarea
            placeholder="Special instructions…"
            value={notes}
            rows={2}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full resize-none rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={placeOrder}
            disabled={submitting}
            className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
          >
            {submitting ? 'Placing Order…' : `Place Order · ${fmt(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}
