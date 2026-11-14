-- Digital Kado Cerita fulfillment and recipient-bound QR access.
-- Applied to production Supabase project zmeqpwxlcvvrdssymett on 2026-11-14.

alter table public.orders add column if not exists fulfillment_type text not null default 'physical', add column if not exists digital_recipient_user_id uuid references auth.users(id);
alter table public.orders drop constraint if exists orders_fulfillment_type_check;
alter table public.orders add constraint orders_fulfillment_type_check check (fulfillment_type in ('physical','digital','mixed'));

create table if not exists public.story_gift_access (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade, recipient_user_id uuid not null references auth.users(id) on delete cascade, recipient_email text not null, access_token uuid not null unique default gen_random_uuid(), expires_at timestamptz not null, created_at timestamptz not null default now());
create index if not exists story_gift_access_recipient_idx on public.story_gift_access(recipient_user_id,expires_at desc);
alter table public.story_gift_access enable row level security;
revoke all on public.story_gift_access from public,anon,authenticated;
grant select,insert,update,delete on public.story_gift_access to service_role;

CREATE OR REPLACE FUNCTION public.apply_midtrans_notification(p_provider_order_id text, p_transaction_id text, p_transaction_status text, p_fraud_status text, p_status_code text, p_gross_amount numeric, p_payment_type text, p_raw_response jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_next_status text;
  v_access_token uuid;
begin
  select * into v_payment from public.payments
    where provider='midtrans' and provider_reference=p_provider_order_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  select * into v_order from public.orders where id=v_payment.order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_gross_amount is null or p_gross_amount<>v_payment.amount or p_gross_amount<>v_order.total_amount then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  if p_transaction_status in ('settlement','capture') and p_status_code='200'
     and (p_fraud_status is null or lower(p_fraud_status)='accept') then v_next_status:='success';
  elsif p_transaction_status='pending' then v_next_status:='pending';
  elsif p_transaction_status='expire' then v_next_status:='expired';
  elsif p_transaction_status in ('deny','cancel','failure') or lower(coalesce(p_fraud_status,''))='deny' then v_next_status:='failed';
  elsif p_transaction_status='refund' then v_next_status:='refunded';
  else return jsonb_build_object('received',true,'ignored',true,'transactionStatus',p_transaction_status);
  end if;

  if v_payment.status in ('success','failed','expired','refunded') then
    if v_payment.status=v_next_status then
      return jsonb_build_object('received',true,'duplicate',true,'paymentStatus',v_payment.status);
    end if;
    if v_payment.status='success' and v_next_status<>'refunded' then
      return jsonb_build_object('received',true,'ignored',true,'paymentStatus',v_payment.status);
    end if;
  end if;

  update public.payments set status=v_next_status,
    provider_transaction_id=coalesce(p_transaction_id,provider_transaction_id),
    payment_method=coalesce(p_payment_type,payment_method),
    raw_response=coalesce(p_raw_response,'{}'::jsonb),
    paid_at=case when v_next_status='success' then now() else paid_at end,
    updated_at=now() where id=v_payment.id;

  if v_next_status='success' and v_order.payment_status='pending' then
    update public.orders set payment_status='paid',
      order_status=case when fulfillment_type='digital' then 'completed' else 'paid' end,
      paid_at=now(),delivered_at=case when fulfillment_type='digital' then now() else delivered_at end,
      updated_at=now() where id=v_order.id returning * into v_order;
    if v_order.fulfillment_type in ('digital','mixed') then
      insert into public.story_gift_access(order_id,recipient_user_id,recipient_email,expires_at)
      values(v_order.id,v_order.digital_recipient_user_id,v_order.recipient_email,now()+interval '7 days')
      on conflict(order_id) do nothing returning access_token into v_access_token;
      if v_access_token is null then
        select access_token into v_access_token from public.story_gift_access where order_id=v_order.id;
      end if;
    end if;
    insert into public.order_status_history(order_id,status,note,changed_by)
      values(v_order.id,case when v_order.fulfillment_type='digital' then 'completed' else 'paid' end,
        case when v_order.fulfillment_type='digital' then 'Pembayaran Kado Cerita terverifikasi. Akses digital aktif selama 7 hari.'
             else 'Pembayaran Midtrans berhasil diverifikasi melalui notifikasi.' end,null);
  elsif v_next_status in ('failed','expired') and v_order.payment_status='pending' then
    update public.products p set stock=p.stock+oi.quantity,updated_at=now()
      from public.order_items oi where oi.order_id=v_order.id and oi.product_id=p.id;
    update public.orders set payment_status=v_next_status,order_status='cancelled',cancelled_at=now(),updated_at=now()
      where id=v_order.id;
    insert into public.order_status_history(order_id,status,note,changed_by)
      values(v_order.id,'cancelled','Pembayaran Midtrans '||v_next_status||'. Stok dikembalikan.',null);
  elsif v_next_status='refunded' then
    update public.orders set payment_status='refunded',order_status='refunded',updated_at=now()
      where id=v_order.id;
    delete from public.story_gift_access where order_id=v_order.id;
    insert into public.order_status_history(order_id,status,note,changed_by)
      values(v_order.id,'refunded','Pembayaran Midtrans dikembalikan. Akses cerita dicabut.',null);
  end if;
  return jsonb_build_object('received',true,'paymentStatus',v_next_status,
    'orderNumber',v_order.order_number,'fulfillmentType',v_order.fulfillment_type);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_demo_order(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_slug text;
  v_quantity integer;
  v_product record;
  v_subtotal numeric := 0;
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
  v_email text := lower(nullif(trim(p_payload->>'email'),''));
  v_recipient_user_id uuid;
  v_has_digital boolean := false;
  v_has_physical boolean := false;
  v_fulfillment text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id=v_user_id and role_id='customer') then
    raise exception 'CUSTOMER_ONLY';
  end if;
  if v_method not in ('qris','va','bank') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if v_card_type not in ('none','plain','special','luxury') then raise exception 'INVALID_GIFT_CARD'; end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 30 then
    raise exception 'INVALID_CART';
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_slug := nullif(v_item->>'productId','');
    begin v_quantity := (v_item->>'quantity')::integer;
    exception when others then raise exception 'INVALID_QUANTITY'; end;
    if v_slug is null or v_quantity < 1 or v_quantity > 20 then raise exception 'INVALID_CART_ITEM'; end if;

    select id,seller_id,name,price,stock,metadata,sku,delivery_type
      into v_product from public.products
      where slug=v_slug and status='active'
      for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE: %', v_slug; end if;
    if v_product.stock < v_quantity then raise exception 'INSUFFICIENT_STOCK: %', v_slug; end if;
    if v_product.delivery_type='digital-audio' then v_has_digital:=true;
    else v_has_physical:=true; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  v_fulfillment := case when v_has_digital and v_has_physical then 'mixed'
                        when v_has_digital then 'digital' else 'physical' end;

  if v_has_digital then
    if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'RECIPIENT_EMAIL_REQUIRED';
    end if;
    select u.id into v_recipient_user_id
      from auth.users u join public.profiles p on p.id=u.id
      where lower(u.email)=v_email and u.email_confirmed_at is not null
        and p.role_id='customer' limit 1;
    if v_recipient_user_id is null then raise exception 'RECIPIENT_ACCOUNT_NOT_VERIFIED'; end if;
    if v_card_type='none' or jsonb_typeof(p_payload->'giftCardDesign') <> 'object'
       or nullif(trim(p_payload->>'giftRecipient'),'') is null
       or nullif(trim(p_payload->>'giftSender'),'') is null
       or nullif(trim(p_payload->>'giftMessage'),'') is null then
      raise exception 'STORY_GIFT_CARD_REQUIRED';
    end if;
    v_name := coalesce(nullif(trim(p_payload->>'giftRecipient'),''),v_name);
  end if;

  if v_has_physical and (v_name is null or v_phone is null or v_address is null) then
    raise exception 'RECIPIENT_FIELDS_REQUIRED';
  end if;
  if not v_has_digital and v_name is null then raise exception 'RECIPIENT_FIELDS_REQUIRED'; end if;

  insert into public.orders
    (buyer_id,recipient_name,recipient_email,recipient_phone,shipping_address,
     subtotal,shipping_cost,discount_amount,gift_card_fee,total_amount,
     order_status,payment_status,shipping_quote_status,buyer_note,payment_method,gift_card_design,
     fulfillment_type,digital_recipient_user_id)
  values
    (v_user_id,coalesce(v_name,'Penerima Digital'),v_email,
     case when v_has_physical then v_phone else 'DIGITAL' end,
     case when v_has_physical then jsonb_build_object('address',v_address) else jsonb_build_object('delivery','digital') end,
     v_subtotal,0,0,v_card_fee,v_subtotal+v_card_fee,
     'pending_payment','pending',case when v_fulfillment='digital' then 'quoted' else 'pending' end,
     nullif(trim(p_payload->>'notes'),''),v_method,
     case when v_has_digital then p_payload->'giftCardDesign'
          when v_card_type='none' then null else p_payload->'giftCardDesign' end,
     v_fulfillment,v_recipient_user_id)
  returning id,order_number into v_order_id,v_order_number;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_slug := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    select id,seller_id,name,price,stock,metadata,sku into v_product
      from public.products where slug=v_slug and status='active';
    update public.products set stock=stock-v_quantity,updated_at=now()
      where id=v_product.id and stock>=v_quantity;
    if not found then raise exception 'INSUFFICIENT_STOCK: %',v_slug; end if;
    insert into public.order_items
      (order_id,product_id,seller_id,product_name,product_image_url,sku,unit_price,quantity,line_total,gift_message)
    values
      (v_order_id,v_product.id,v_product.seller_id,v_product.name,v_product.metadata->>'image',
       v_product.sku,v_product.price,v_quantity,v_product.price*v_quantity,
       nullif(trim(p_payload->>'giftMessage'), ''));
  end loop;

  insert into public.order_status_history(order_id,status,note,changed_by)
  values (v_order_id,'pending_payment',
    case when v_fulfillment='digital' then 'Pesanan Kado Cerita dibuat. Tidak memerlukan alamat atau ongkir.'
         when v_fulfillment='mixed' then 'Pesanan campuran dibuat. Produk fisik menunggu penetapan ongkir.'
         else 'Pesanan dibuat. Menunggu penetapan ongkir oleh admin.' end,
    v_user_id);

  return jsonb_build_object('id',v_order_id,'orderNumber',v_order_number,
    'subtotal',v_subtotal,'giftCardFee',v_card_fee,'total',v_subtotal+v_card_fee,
    'fulfillmentType',v_fulfillment);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.seller_update_order_status(p_order_number text, p_status text, p_courier text DEFAULT NULL::text, p_tracking_number text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_order public.orders%rowtype; v_user_id uuid:=auth.uid();
begin
  if v_user_id is null or not exists(select 1 from public.profiles where id=v_user_id and role_id='umkm') then raise exception 'SELLER_ONLY'; end if;
  select o.* into v_order from public.orders o where o.order_number=p_order_number
    and exists(select 1 from public.order_items oi where oi.order_id=o.id and oi.seller_id=v_user_id) for update;
  if not found then raise exception 'SELLER_ORDER_NOT_FOUND'; end if;
  if v_order.fulfillment_type='digital' then raise exception 'DIGITAL_ORDER_NO_FULFILLMENT'; end if;
  if v_order.payment_status<>'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if p_status not in ('processing','shipped','completed') then raise exception 'INVALID_SELLER_ORDER_STATUS'; end if;
  if p_status='processing' then
    if v_order.order_status<>'paid' then raise exception 'ORDER_NOT_AWAITING_ACCEPTANCE'; end if;
    update public.orders set order_status='processing',updated_at=now() where id=v_order.id returning * into v_order;
    insert into public.order_status_history(order_id,status,note,changed_by) values(v_order.id,'processing','Pesanan diterima oleh mitra UMKM dan sedang disiapkan.',v_user_id);
  elsif p_status='shipped' then
    if v_order.order_status<>'processing' then raise exception 'ORDER_NOT_PROCESSING'; end if;
    if nullif(trim(p_courier),'') is null or nullif(trim(p_tracking_number),'') is null then raise exception 'COURIER_AND_TRACKING_REQUIRED'; end if;
    update public.orders set order_status='shipped',shipping_courier=left(trim(p_courier),60),tracking_number=left(trim(p_tracking_number),100),shipped_at=now(),updated_at=now() where id=v_order.id returning * into v_order;
    insert into public.order_status_history(order_id,status,note,changed_by) values(v_order.id,'shipped','Resi simulasi dibuat oleh mitra UMKM: '||v_order.tracking_number||'. Pengiriman tidak terhubung dengan kurir eksternal.',v_user_id);
  else
    if v_order.order_status<>'shipped' then raise exception 'ORDER_NOT_SHIPPED'; end if;
    update public.orders set order_status='completed',updated_at=now() where id=v_order.id returning * into v_order;
    insert into public.order_status_history(order_id,status,note,changed_by) values(v_order.id,'completed','Pesanan ditandai selesai oleh mitra UMKM setelah simulasi pengiriman.',v_user_id);
  end if;
  return jsonb_build_object('orderNumber',v_order.order_number,'orderStatus',v_order.order_status,'courier',v_order.shipping_courier,'trackingNumber',v_order.tracking_number);
end;
$function$
;

revoke all on function public.create_demo_order(jsonb) from public,anon;
grant execute on function public.create_demo_order(jsonb) to authenticated;
revoke all on function public.apply_midtrans_notification(text,text,text,text,text,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_midtrans_notification(text,text,text,text,text,numeric,text,jsonb) to service_role;
revoke all on function public.seller_update_order_status(text,text,text,text) from public,anon;
grant execute on function public.seller_update_order_status(text,text,text,text) to authenticated;

-- Restrict story pages and audio to the exact recipient account during the 7-day entitlement.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to authenticated;

create or replace function private.can_read_story_product(p_product_id uuid)
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$
  select exists(select 1 from public.story_gift_access a
    join public.orders o on o.id=a.order_id
    join public.order_items oi on oi.order_id=o.id
    where oi.product_id=p_product_id and a.recipient_user_id=auth.uid()
      and a.expires_at>now() and o.payment_status='paid');
$$;
revoke all on function private.can_read_story_product(uuid) from public,anon;
grant execute on function private.can_read_story_product(uuid) to authenticated;

create or replace function private.can_read_story_audio(p_object_name text)
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$
  select exists(select 1 from public.story_pages sp
    join public.story_gift_access a on a.order_id is not null
    join public.orders o on o.id=a.order_id
    join public.order_items oi on oi.order_id=o.id and oi.product_id=sp.product_id
    where sp.audio_url=p_object_name and a.recipient_user_id=auth.uid()
      and a.expires_at>now() and o.payment_status='paid');
$$;
revoke all on function private.can_read_story_audio(text) from public,anon;
grant execute on function private.can_read_story_audio(text) to authenticated;

drop policy if exists "Public can read pages of published stories" on public.story_pages;
drop policy if exists "Recipients can read pages of purchased stories" on public.story_pages;
create policy "Recipients can read pages of purchased stories" on public.story_pages
  for select to authenticated using (private.can_read_story_product(product_id));
drop policy if exists "Public can read audio for published stories" on storage.objects;
drop policy if exists "Recipients can read purchased story audio" on storage.objects;
create policy "Recipients can read purchased story audio" on storage.objects
  for select to authenticated using (bucket_id='story-media' and private.can_read_story_audio(name));
