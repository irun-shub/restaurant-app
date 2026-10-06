'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { money } from '../../lib/config';

const EMPTY = { id: null, name: '', category: '', price: '', description: '' };

export default function Admin() {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('menu');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(e) {
    e.preventDefault();
    setLoginErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setLoginErr('Wrong email or password.');
  }

  if (session === undefined) return <div className="a-wrap">Loading…</div>;

  if (!session) {
    return (
      <div className="a-wrap" style={{ maxWidth: 380 }}>
        <h1>Owner login</h1>
        <form onSubmit={login}>
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          {loginErr && <p className="err">{loginErr}</p>}
          <button className="primary" type="submit">Log in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="a-wrap">
      <div className="a-head">
        <h1 style={{ margin: 0 }}>Manage restaurant</h1>
        <button className="link" onClick={() => supabase.auth.signOut()}>Log out</button>
      </div>
      <div className="a-tabs">
        <button className={'tab ' + (tab === 'menu' ? 'on' : '')} onClick={() => setTab('menu')}>Menu</button>
        <button className={'tab ' + (tab === 'orders' ? 'on' : '')} onClick={() => setTab('orders')}>Orders &amp; payments</button>
      </div>
      {tab === 'menu' ? <MenuManager /> : <OrdersManager />}
    </div>
  );
}

/* ------------------------------ MENU ------------------------------ */
function MenuManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('menu_items').select('*').order('category').order('name');
    setItems(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const categories = [...new Set(items.map((i) => i.category))];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setMsg('');
    const row = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      description: form.description.trim() || null,
    };
    if (!row.name || !row.category || !(row.price >= 0)) {
      setMsg('Enter a name, a category, and a valid price.');
      return;
    }
    setSaving(true);
    const { error } = form.id
      ? await supabase.from('menu_items').update(row).eq('id', form.id)
      : await supabase.from('menu_items').insert(row);
    setSaving(false);
    if (error) { setMsg('Could not save: ' + error.message); return; }
    setForm(EMPTY);
    load();
  }

  async function toggle(i) {
    await supabase.from('menu_items').update({ available: !i.available }).eq('id', i.id);
    load();
  }

  async function remove(i) {
    if (!confirm(`Delete "${i.name}"? Past orders are not affected.`)) return;
    await supabase.from('menu_items').delete().eq('id', i.id);
    load();
  }

  return (
    <>
      <form className="a-form" onSubmit={save}>
        <input className="field" placeholder="Item name" value={form.name} onChange={set('name')} />
        <input className="field" placeholder="Category (e.g. Mains)" list="cats" value={form.category} onChange={set('category')} />
        <input className="field" placeholder="Price ₹" type="number" min="0" step="0.5" inputMode="decimal" value={form.price} onChange={set('price')} />
        <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <input className="field full" placeholder="Short description (optional)" value={form.description} onChange={set('description')} />
        <div className="btns full">
          <button className="primary" type="submit" disabled={saving}>{form.id ? 'Save changes' : 'Add item'}</button>
          {form.id && <button type="button" className="link" onClick={() => setForm(EMPTY)}>Cancel edit</button>}
          {msg && <span className="err" style={{ margin: 0 }}>{msg}</span>}
        </div>
      </form>

      {items.length === 0 && <p className="meta">No items yet. Add your first dish above.</p>}

      {categories.map((c) => (
        <section key={c}>
          <h2 className="cat">{c}</h2>
          {items.filter((i) => i.category === c).map((i) => (
            <div key={i.id} className={'a-item ' + (i.available ? '' : 'off')}>
              <div>
                <h3>{i.name} · {money(i.price)}</h3>
                {i.description && <div className="meta">{i.description}</div>}
                {!i.available && <div className="meta">Hidden from customers (sold out)</div>}
              </div>
              <div className="a-actions">
                <button className="sm" onClick={() => toggle(i)}>{i.available ? 'Mark sold out' : 'Show again'}</button>
                <button className="sm" onClick={() => { setForm({ id: i.id, name: i.name, category: i.category, price: String(i.price), description: i.description || '' }); window.scrollTo(0, 0); }}>Edit</button>
                <button className="sm danger" onClick={() => remove(i)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

/* ----------------------------- ORDERS ----------------------------- */
function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [show, setShow] = useState('needs'); // needs | all

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('order_number', { ascending: false }).limit(100);
    setOrders(data || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function setPay(o, payment_status) {
    await supabase.from('orders').update({ payment_status }).eq('id', o.id);
    load();
  }

  const list = orders.filter((o) => (show === 'all' ? true : o.payment_status !== 'paid'));

  return (
    <>
      <p className="meta">
        Open your UPI app&apos;s payment history, find the payment with the matching amount and the
        note <strong>Order &lt;number&gt;</strong>, then tap <strong>Confirm payment</strong>. The
        customer&apos;s screen turns green right after.
      </p>
      <div className="filter" style={{ marginTop: 0, marginBottom: 14 }}>
        <button className={'tab ' + (show === 'needs' ? 'on' : '')} onClick={() => setShow('needs')}>Awaiting payment</button>
        <button className={'tab ' + (show === 'all' ? 'on' : '')} onClick={() => setShow('all')}>All recent orders</button>
        <button className="sm" onClick={load}>Refresh</button>
      </div>

      {list.length === 0 && <p className="meta">Nothing here.</p>}

      {list.map((o) => (
        <div key={o.id} className={'o-card ' + o.payment_status}>
          <h3>
            <span>#{o.order_number} · {money(o.total)}</span>
            <span className={'badge ' + o.payment_status}>
              {o.payment_status === 'pending' ? 'Not paid yet' : o.payment_status === 'claimed' ? 'Customer says paid' : 'Paid'}
            </span>
          </h3>
          <div className="meta">
            {o.customer_name || 'No name'} · {new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          <ul>{o.items.map((it, i) => <li key={i}>{it.qty} × {it.name}</li>)}</ul>
          <div className="a-actions" style={{ justifyContent: 'flex-start' }}>
            {o.payment_status !== 'paid' && <button className="sm go" onClick={() => setPay(o, 'paid')}>Confirm payment</button>}
            {o.payment_status === 'paid' && <button className="sm" onClick={() => setPay(o, 'pending')}>Undo</button>}
          </div>
        </div>
      ))}
    </>
  );
}
