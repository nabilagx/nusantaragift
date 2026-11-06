-- Prevent recursive RLS evaluation between orders and order_items.
create or replace function public.is_seller_of_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (select 1 from public.order_items oi
      where oi.order_id=p_order_id and oi.seller_id=auth.uid());
$$;
revoke all on function public.is_seller_of_order(uuid) from public, anon;
grant execute on function public.is_seller_of_order(uuid) to authenticated;

drop policy if exists "Sellers read order rows for their products" on public.orders;
create policy "Sellers read order rows for their products"
on public.orders for select to authenticated
using (public.is_seller_of_order(id));

-- Seller order actions: paid -> processing -> shipped.
create or replace function public.seller_update_order_status(
  p_order_number text, p_status text, p_courier text default null, p_tracking_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (select 1 from public.profiles where id=v_user_id and role_id='umkm') then
    raise exception 'SELLER_ONLY';
  end if;
  if p_status not in ('processing','shipped') then raise exception 'INVALID_SELLER_ORDER_STATUS'; end if;
  select o.* into v_order from public.orders o
  where o.order_number=p_order_number and exists (
    select 1 from public.order_items oi where oi.order_id=o.id and oi.seller_id=v_user_id
  ) for update;
  if not found then raise exception 'SELLER_ORDER_NOT_FOUND'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if p_status='processing' then
    if v_order.order_status <> 'paid' then raise exception 'ORDER_NOT_AWAITING_ACCEPTANCE'; end if;
    update public.orders set order_status='processing',updated_at=now() where id=v_order.id returning * into v_order;
    insert into public.order_status_history(order_id,status,note,changed_by)
    values(v_order.id,'processing','Pesanan diterima oleh mitra UMKM dan sedang disiapkan.',v_user_id);
  else
    if v_order.order_status <> 'processing' then raise exception 'ORDER_NOT_PROCESSING'; end if;
    if nullif(trim(p_courier),'') is null or nullif(trim(p_tracking_number),'') is null then raise exception 'COURIER_AND_TRACKING_REQUIRED'; end if;
    update public.orders set order_status='shipped',shipping_courier=left(trim(p_courier),60),
      tracking_number=left(trim(p_tracking_number),100),shipped_at=now(),updated_at=now()
    where id=v_order.id returning * into v_order;
    insert into public.order_status_history(order_id,status,note,changed_by)
    values(v_order.id,'shipped','Pesanan dikirim melalui '||v_order.shipping_courier||' dengan resi '||v_order.tracking_number||'.',v_user_id);
  end if;
  return jsonb_build_object('orderNumber',v_order.order_number,'orderStatus',v_order.order_status,
    'courier',v_order.shipping_courier,'trackingNumber',v_order.tracking_number);
end;
$$;
revoke all on function public.seller_update_order_status(text,text,text,text) from public,anon;
grant execute on function public.seller_update_order_status(text,text,text,text) to authenticated;

-- This helper was only intended for database administration, not the Data API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;


-- Seller catalog lifecycle and administrator activity alerts.
drop policy if exists "Sellers can update own products" on public.products;
create policy "Sellers can update own products"
on public.products for update to authenticated
using (
  seller_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role_id='umkm')
)
with check (
  seller_id = (select auth.uid())
  and status in ('draft','pending_review','rejected','active','archived')
  and exists (
    select 1 from public.profiles p
    join public.seller_profiles sp on sp.user_id=p.id
    where p.id=(select auth.uid()) and p.role_id='umkm' and sp.status='approved'
  )
);

create or replace function public.notify_admin_product_archived()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from 'archived'
     and new.status = 'archived'
     and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role_id='umkm') then
    insert into public.notifications (user_id,title,message,type,related_order_id)
    select p.id,'Produk diarsipkan oleh UMKM',
      format('%s mengarsipkan produk "%s" (ID: %s).',coalesce(sp.business_name,'Mitra UMKM'),new.name,new.id),
      'warning',new.id::text
    from public.profiles p
    left join public.seller_profiles sp on sp.user_id=new.seller_id
    where p.role_id='admin';
  end if;
  return new;
end;
$$;
revoke all on function public.notify_admin_product_archived() from public,anon,authenticated;
drop trigger if exists trg_notify_admin_product_archived on public.products;
create trigger trg_notify_admin_product_archived
after update of status on public.products
for each row execute function public.notify_admin_product_archived();
create index if not exists notifications_admin_unread_created_idx
on public.notifications(user_id,is_read,created_at desc);
