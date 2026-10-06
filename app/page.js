'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_NAME, UPI_ID, money, upiLink } from '../lib/config';

export default function MenuPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null); // { id, number, total, payment }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError('Could not load the menu. Please refresh.');
        setMenu(data || []);
        setLoading(false);
      });

    // Restore an unfinished order after a refresh or after returning from the UPI app
    try {
      const id = localStorage.getItem('active_order');
      if (id) refreshOrder(id);
    } catch {}
  }, []);

  async function refreshOrder(id) {
    const { data } = await supabase.rpc('get_order', { p_id: id });
    if (data?.[0]) {
      setOrder({ id, number: data[0].o_number, total: data[0].o_total, payment: data[0].o_payment });
      if (data[0].o_payment === 'paid') localStorage.removeItem('active_order');
    } else {
      localStorage.removeItem('active_order');
    }
  }

  // Poll until the owner confirms payment
  useEffect(() => {
    if (!order?.id || order.payment === 'paid') return;
    const t = setInterval(() => refreshOrder(order.id), 5000);
    return () => clearInterval(t);
  }, [order?.id, order?.payment]);

  // Refresh when the customer switches back from the UPI app
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && order?.id) refreshOrder(order.id);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [order?.id]);

  const categories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);
  const lines = menu.filter((m) => cart[m.id] > 0);
  const count = lines.reduce((s, m) => s + cart[m.id], 0);
  const total = lines.reduce((s, m) => s + cart[m.id] * Number(m.price), 0);

  const change = (id, d) =>
    setCart((c) => {
      const q = Math.max(0, Math.min(50, (c[id] || 0) + d));
      const next = { ...c, [id]: q };
      if (q === 0) delete next[id];
      return next;
    });

  async function placeOrder() {
    setBusy(true);
    setError('');
    const { data, error } = await supabase.rpc('place_order', {
      p_name: name.trim(),
      p_cart: lines.map((m) => ({ id: m.id, qty: cart[m.id] })),
    });
    setBusy(false);
    if (error || !data?.[0]) {
      setError('We could not place your order. An item may have just sold out. Please refresh and try again.');
      return;
    }
    localStorage.setItem('active_order', data[0].o_id);
    setOrder({ id: data[0].o_id, number: data[0].o_number, total: data[0].o_total, payment: 'pending' });
    setCart({});
    setOpen(false);
    window.scrollTo(0, 0);
  }

  async function claim() {
    await supabase.rpc('claim_payment', { p_id: order.id });
    refreshOrder(order.id);
  }

  function newOrder() {
    localStorage.removeItem('active_order');
    setOrder(null);
  }

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  // ---------- Order + payment screen ----------
  if (order) {
    return (
      <div className="wrap">
        <div className="done">
          <p>Your order number</p>
          <div className="num">#{order.number}</div>

          {order.payment === 'paid' ? (
            <>
              <span className="pill ready">Payment confirmed</span>
              <p style={{ color: 'var(--muted)', marginTop: 24 }}>
                Thank you! Show order #{order.number} at the counter.
              </p>
              <button className="link" onClick={newOrder}>Place another order</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '8px 0 20px' }}>
                Amount to pay: {money(order.total)}
              </p>

              <a className="primary payBtn" href={upiLink(order)}>Pay now with UPI</a>
              <p className="meta" style={{ marginTop: 8 }}>
                Opens Google Pay, PhonePe, Paytm or any UPI app on this phone.
              </p>

              <div className="manual">
                <p className="meta" style={{ margin: 0 }}>Button not working? Pay manually to</p>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>{UPI_ID}</p>
                <p className="meta" style={{ margin: 0 }}>
                  Amount {money(order.total)} · Note: Order {order.number}
                </p>
                <button className="link" onClick={copyUpi}>{copied ? 'Copied' : 'Copy UPI ID'}</button>
              </div>

              {order.payment === 'pending' ? (
                <button className="primary alt" onClick={claim}>I have paid</button>
              ) : (
                <span className="pill">Waiting for the restaurant to confirm your payment…</span>
              )}
              <p className="meta" style={{ marginTop: 14 }}>
                This page updates by itself once your payment is confirmed.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- Menu ----------
  return (
    <div className="wrap">
      <header className="top">
        <h1>{RESTAURANT_NAME}</h1>
        <p>Pick your items, place the order, and pay with UPI.</p>
      </header>

      {loading && <p>Loading menu…</p>}
      {error && !open && <p className="err">{error}</p>}
      {!loading && menu.length === 0 && !error && <p>The menu is being updated. Please check back soon.</p>}

      {categories.length > 0 && (
        <nav className="tabs" aria-label="Menu categories">
          {categories.map((c) => (
            <button key={c} className="tab" onClick={() => document.getElementById('cat-' + c)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {c}
            </button>
          ))}
        </nav>
      )}

      {categories.map((c) => (
        <section key={c} id={'cat-' + c} style={{ scrollMarginTop: 64 }}>
          <h2 className="cat">{c}</h2>
          {menu.filter((m) => m.category === c).map((m) => (
            <div className="item" key={m.id}>
              <div>
                <h3>{m.name}</h3>
                {m.description && <p>{m.description}</p>}
                <div className="price">{money(m.price)}</div>
              </div>
              {cart[m.id] ? (
                <div className="stepper">
                  <button aria-label={'Remove one ' + m.name} onClick={() => change(m.id, -1)}>−</button>
                  <span>{cart[m.id]}</span>
                  <button aria-label={'Add one ' + m.name} onClick={() => change(m.id, 1)}>+</button>
                </div>
              ) : (
                <button className="add" onClick={() => change(m.id, 1)}>Add</button>
              )}
            </div>
          ))}
        </section>
      ))}

      {count > 0 && !open && (
        <div className="bar">
          <button onClick={() => setOpen(true)}>
            <span>View order ({count} {count === 1 ? 'item' : 'items'})</span>
            <span>{money(total)}</span>
          </button>
        </div>
      )}

      {open && (
        <div className="sheet-bg" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Your order</h2>
            {lines.map((m) => (
              <div className="row" key={m.id}>
                <div>
                  <strong>{m.name}</strong>
                  <div className="meta">{money(m.price)} each</div>
                </div>
                <div className="stepper">
                  <button aria-label={'Remove one ' + m.name} onClick={() => change(m.id, -1)}>−</button>
                  <span>{cart[m.id]}</span>
                  <button aria-label={'Add one ' + m.name} onClick={() => change(m.id, 1)}>+</button>
                </div>
              </div>
            ))}
            <div className="total"><span>Total</span><span>{money(total)}</span></div>
            <label htmlFor="cname">Your name (optional)</label>
            <input id="cname" className="field" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="So we can call you" />
            {error && <p className="err">{error}</p>}
            <button className="primary" disabled={busy || count === 0} onClick={placeOrder}>
              {busy ? 'Placing order…' : 'Continue to payment · ' + money(total)}
            </button>
            <button className="link" onClick={() => setOpen(false)}>Back to menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
