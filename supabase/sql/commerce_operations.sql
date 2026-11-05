create or replace function public.seller_update_order_status(
  p_order_number text,
  p_status text,
  p_courier text default null,
  p_tracking_number text default null
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
