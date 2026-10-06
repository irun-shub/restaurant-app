-- Run this whole file in Supabase > SQL Editor (fresh project)

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  description text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence order_number_seq start 101;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null default nextval('order_number_seq'),
  customer_name text,
  items jsonb not null,
  total numeric(10,2) not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','claimed','paid')),
  status text not null default 'new',   -- reserved for the kitchen system later
  created_at timestamptz not null default now()
);

alter table menu_items enable row level security;
alter table orders enable row level security;

-- Menu: everyone reads, only logged-in owner edits
create policy "public reads menu" on menu_items for select using (true);
create policy "owner manages menu" on menu_items for all to authenticated
  using (true) with check (true);

-- Orders: only the logged-in owner touches the table directly
create policy "owner manages orders" on orders for all to authenticated
  using (true) with check (true);

-- Customers place an order through this function.
-- Prices come from the menu table, never from the browser.
create or replace function place_order(p_name text, p_cart jsonb)
returns table(o_id uuid, o_number int, o_total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb;
  v_total numeric;
begin
  select jsonb_agg(jsonb_build_object(
           'id', m.id, 'name', m.name, 'price', m.price,
           'qty', (c->>'qty')::int)),
         sum(m.price * (c->>'qty')::int)
    into v_items, v_total
    from jsonb_array_elements(p_cart) c
    join menu_items m on m.id = (c->>'id')::uuid and m.available
   where (c->>'qty')::int between 1 and 50;

  if v_items is null or v_total <= 0 then
    raise exception 'Cart is empty';
  end if;

  return query
    insert into orders (customer_name, items, total)
    values (left(coalesce(p_name, ''), 50), v_items, v_total)
    returning orders.id, orders.order_number, orders.total;
end $$;

-- Customer's phone checks its own order (needs the secret order id)
create or replace function get_order(p_id uuid)
returns table(o_number int, o_total numeric, o_payment text)
language sql security definer set search_path = public as $$
  select order_number, total, payment_status from orders where id = p_id;
$$;

-- Customer taps "I've paid"
create or replace function claim_payment(p_id uuid)
returns void
language sql security definer set search_path = public as $$
  update orders set payment_status = 'claimed'
   where id = p_id and payment_status = 'pending';
$$;

grant execute on function place_order(text, jsonb) to anon, authenticated;
grant execute on function get_order(uuid) to anon, authenticated;
grant execute on function claim_payment(uuid) to anon, authenticated;

-- Sample menu (edit or delete)
insert into menu_items (name, category, price, description) values
 ('Paneer Tikka',   'Starters', 220, 'Char-grilled cottage cheese, mint chutney'),
 ('Veg Spring Roll','Starters', 150, 'Crispy rolls with sweet chilli sauce'),
 ('Dal Makhani',    'Mains',    240, 'Slow-cooked black lentils'),
 ('Butter Chicken', 'Mains',    320, 'Creamy tomato gravy'),
 ('Butter Naan',    'Breads',    45, null),
 ('Masala Chai',    'Drinks',    30, null),
 ('Sweet Lassi',    'Drinks',    80, null);
