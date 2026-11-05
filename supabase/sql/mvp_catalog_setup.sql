-- NusantaraGift MVP commerce foundation
alter table public.products
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists delivery_type text not null default 'physical';
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status = any (array['draft','pending_review','active','archived','rejected']));

alter table public.orders
  add column if not exists shipping_quote_status text not null default 'pending',
  add column if not exists shipping_quoted_at timestamptz,
  add column if not exists gift_card_fee numeric not null default 0,
  add column if not exists gift_card_design jsonb,
  add column if not exists payment_method text;
alter table public.orders drop constraint if exists orders_shipping_quote_status_check;
alter table public.orders add constraint orders_shipping_quote_status_check
  check (shipping_quote_status = any (array['pending','quoted']));
alter table public.orders add constraint orders_gift_card_fee_check check (gift_card_fee >= 0);

create index if not exists products_status_created_at_idx on public.products (status, created_at desc);
create index if not exists products_seller_created_at_idx on public.products (seller_id, created_at desc);
create index if not exists orders_buyer_created_at_idx on public.orders (buyer_id, created_at desc);

drop policy if exists "Anyone can read active categories" on public.categories;
create policy "Anyone can read active categories" on public.categories
  for select to anon, authenticated using (is_active = true);
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'));

drop policy if exists "Admins manage all products" on public.products;
create policy "Admins manage all products" on public.products for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'));
drop policy if exists "Sellers can update own products" on public.products;
create policy "Sellers can update own products" on public.products for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()) and status in ('draft','pending_review','rejected'));

drop policy if exists "Sellers can update own seller profile" on public.seller_profiles;
create policy "Sellers can update own seller profile" on public.seller_profiles for update to authenticated
  using (user_id = (select auth.uid()) and status = 'approved')
  with check (user_id = (select auth.uid()) and status = 'approved');
drop policy if exists "Admins manage seller profiles" on public.seller_profiles;
create policy "Admins manage seller profiles" on public.seller_profiles for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'));

insert into public.categories (name, slug, description, is_active, sort_order)
values ('Cerita','cerita','Kado cerita dan narasi budaya Nusantara.',true,1),
       ('Rasa','rasa','Produk makanan dan cita rasa daerah.',true,2),
       ('Budaya','budaya','Produk budaya dan kerajinan daerah.',true,3)
on conflict (slug) do update set name=excluded.name, description=excluded.description, is_active=true, sort_order=excluded.sort_order;

insert into public.seller_profiles (user_id,business_name,slug,description,status,approved_at)
values ('58de8be3-3762-46f5-a1c2-995118f96abc','UMKM Demo Nusantara','umkm-demo-nusantara',
        'Akun demonstrasi mitra UMKM NusantaraGift.','approved',now())
on conflict (user_id) do update set business_name=excluded.business_name, slug=excluded.slug,
  description=excluded.description, status='approved',
  approved_at=coalesce(public.seller_profiles.approved_at,now());

insert into public.products
  (seller_id,category_id,name,slug,description,price,stock,sku,is_gift_card_enabled,status,delivery_type,metadata)
values
('58de8be3-3762-46f5-a1c2-995118f96abc',(select id from public.categories where slug='cerita'),'Kado Cerita – Edisi Timur Indonesia','cerita-timur','Jelajahi kisah dan kekayaan cerita dari wilayah Timur Indonesia.',20000,50,'DEMO-CERITA-TIMUR',true,'active','digital-audio',
 '{"image":"/images/shop/cerita-timur.png","imageAlt":"Kado Cerita Edisi Timur Indonesia","cardColor":"#E6DBBC","accentColor":"#ECD7A1","region":"NTT, Maluku, Papua","size":"1 Paket Cerita","summary":{"type":"Cerita","format":"Audio","unlock":"QR Code"},"detailDescription":"Kado Cerita Edisi Timur Indonesia membawa kamu menyelami dongeng lokal penuh makna. Dapatkan kisah seperti Putri Mandalika, Naga Komodo, hingga Legenda Asal Mula Tifa – dibawakan dalam narasi suara & visual digital yang hanya bisa diakses setelah box dibuka. Setiap kado dirancang untuk memicu rasa penasaran dan cinta budaya lokal."}'::jsonb),
('58de8be3-3762-46f5-a1c2-995118f96abc',(select id from public.categories where slug='cerita'),'Kado Cerita – Edisi Barat Indonesia','cerita-barat','Kenali ragam kisah dan keunikan dari wilayah Barat Indonesia.',35000,50,'DEMO-CERITA-BARAT',true,'active','digital-audio',
 '{"image":"/images/shop/cerita-barat.png","imageAlt":"Kado Cerita Edisi Barat Indonesia","cardColor":"#E9D8C3","accentColor":"#D8BE9A","region":"Barat Indonesia","size":"1 Paket Cerita","summary":{"type":"Cerita","format":"Audio","unlock":"QR Code"},"detailDescription":"Kenali ragam kisah dan keunikan dari wilayah Barat Indonesia."}'::jsonb),
('58de8be3-3762-46f5-a1c2-995118f96abc',(select id from public.categories where slug='rasa'),'Kado Rasa – Edisi Timur Indonesia','rasa-timur','Makanan khas dari daerah Timur Indonesia.',50000,50,'DEMO-RASA-TIMUR',true,'active','physical',
 '{"image":"/images/shop/be6dc.png","imageAlt":"Kado Rasa Edisi Timur Indonesia","cardColor":"#E6DBBC","accentColor":"#ECD7A1","region":"Timur Indonesia","size":"1 Paket","summary":{"type":"Rasa","format":"Belum ditentukan","unlock":"Belum ditentukan"},"detailDescription":"Makanan khas dari daerah Timur Indonesia."}'::jsonb),
('58de8be3-3762-46f5-a1c2-995118f96abc',(select id from public.categories where slug='budaya'),'Kado Budaya – Edisi Timur Indonesia','budaya-timur','Budaya khas dari daerah Timur Indonesia.',70000,50,'DEMO-BUDAYA-TIMUR',true,'active','physical',
 '{"image":"/images/shop/c90ac.png","imageAlt":"Kado Budaya Edisi Timur Indonesia","cardColor":"#B3AD93","accentColor":"#D1C297","region":"Timur Indonesia","size":"1 Paket","summary":{"type":"Budaya","format":"Belum ditentukan","unlock":"Belum ditentukan"},"detailDescription":"Budaya khas dari daerah Timur Indonesia."}'::jsonb)
on conflict (seller_id,slug) do update set category_id=excluded.category_id,name=excluded.name,
  description=excluded.description,price=excluded.price,stock=excluded.stock,status='active',
  delivery_type=excluded.delivery_type,metadata=excluded.metadata;

-- Server-authoritative checkout. The authenticated customer never supplies price, seller, or totals.
create or replace function public.create_demo_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_slug text;
  v_quantity integer;
  v_product record;
  v_subtotal numeric := 0;
  v_line_total numeric;
  v_card_type text := coalesce(p_payload->>'giftCardType','none');
  v_card_fee numeric := case coalesce(p_payload->>'giftCardType','none')
    when 'special' then 3000 when 'luxury' then 7000 else 0 end;
  v_order_id uuid;
  v_order_number text;
  v_items jsonb := p_payload->'items';
  v_name text := nullif(trim(p_payload->>'name'),'');
  v_phone text := nullif(trim(p_payload->>'phone'),'');
  v_address text := nullif(trim(p_payload->>'address'),'');
  v_method text := coalesce(p_payload->>'paymentMethod','qris');
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id=v_user_id and role_id='customer') then
    raise exception 'CUSTOMER_ONLY';
  end if;
  if v_name is null or v_phone is null or v_address is null then
    raise exception 'RECIPIENT_FIELDS_REQUIRED';
  end if;
  if v_method not in ('qris','va','bank') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if v_card_type not in ('none','plain','special','luxury') then raise exception 'INVALID_GIFT_CARD'; end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 30 then
    raise exception 'INVALID_CART';
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_slug := nullif(v_item->>'productId','');
    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then raise exception 'INVALID_QUANTITY'; end;
    if v_slug is null or v_quantity < 1 or v_quantity > 20 then raise exception 'INVALID_CART_ITEM'; end if;

    select id,seller_id,name,price,stock,metadata,sku
      into v_product from public.products
      where slug=v_slug and status='active'
      for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE: %', v_slug; end if;
    if v_product.stock < v_quantity then raise exception 'INSUFFICIENT_STOCK: %', v_slug; end if;
    v_line_total := v_product.price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  insert into public.orders
    (buyer_id,recipient_name,recipient_email,recipient_phone,shipping_address,
     subtotal,shipping_cost,discount_amount,gift_card_fee,total_amount,
     order_status,payment_status,shipping_quote_status,buyer_note,payment_method,gift_card_design)
  values
    (v_user_id,v_name,nullif(trim(p_payload->>'email'),''),v_phone,
     jsonb_build_object('address',v_address),
     v_subtotal,0,0,v_card_fee,v_subtotal+v_card_fee,
     'pending_payment','pending','pending',nullif(trim(p_payload->>'notes'),''),
     v_method,case when v_card_type='none' then null else p_payload->'giftCardDesign' end)
  returning id,order_number into v_order_id,v_order_number;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_slug := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    select id,seller_id,name,price,stock,metadata,sku into v_product
      from public.products where slug=v_slug and status='active';
    insert into public.order_items
      (order_id,product_id,seller_id,product_name,product_image_url,sku,unit_price,quantity,line_total,gift_message)
    values
      (v_order_id,v_product.id,v_product.seller_id,v_product.name,v_product.metadata->>'image',
       v_product.sku,v_product.price,v_quantity,v_product.price*v_quantity,
       nullif(trim(p_payload->>'giftMessage'),''));
  end loop;

  insert into public.order_status_history(order_id,status,note,changed_by)
  values (v_order_id,'pending_payment','Pesanan dibuat. Menunggu penetapan ongkir oleh admin.',v_user_id);

  return jsonb_build_object('id',v_order_id,'orderNumber',v_order_number,
    'subtotal',v_subtotal,'giftCardFee',v_card_fee,'total',v_subtotal+v_card_fee);
end;
$$;
revoke all on function public.create_demo_order(jsonb) from public;
revoke all on function public.create_demo_order(jsonb) from anon;
grant execute on function public.create_demo_order(jsonb) to authenticated;
