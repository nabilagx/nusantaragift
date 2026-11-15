-- Admin product moderation: read-only catalogue access plus audited moderation actions.
-- Safe to re-run. Product and order rows are preserved; moderation history is retained.

alter table public.products
  drop constraint if exists products_status_check;

alter table public.products
  add constraint products_status_check
  check (status = any (array[
    'draft','pending_review','active','archived','rejected','suspended','banned'
  ]::text[]);

create table if not exists public.product_moderation_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('approve','request_revision','warn','suspend','ban','restore')),
  reason text not null,
  previous_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create index if not exists product_moderation_events_product_created_idx
  on public.product_moderation_events(product_id, created_at desc);
create index if not exists product_moderation_events_actor_created_idx
  on public.product_moderation_events(actor_id, created_at desc);

alter table public.product_moderation_events enable row level security;
revoke all on public.product_moderation_events from anon, authenticated;
grant select on public.product_moderation_events to authenticated;

drop policy if exists "Admins read product moderation events" on public.product_moderation_events;
create policy "Admins read product moderation events"
  on public.product_moderation_events for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role_id = 'admin'
  ));

drop policy if exists "Sellers read own product moderation events" on public.product_moderation_events;
create policy "Sellers read own product moderation events"
  on public.product_moderation_events for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.seller_id = (select auth.uid())
  ));

drop policy if exists "Admins manage all products" on public.products;
drop policy if exists "Admins can read all products" on public.products;
create policy "Admins can read all products"
  on public.products for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role_id = 'admin'
  ));

create or replace function public.admin_moderate_product(
  p_product_id uuid,
  p_action text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_product public.products%rowtype;
  v_new_status text;
  v_reason text := left(trim(coalesce(p_reason,'')),500);
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id=v_actor and p.role_id='admin'
  ) then
    raise exception 'ADMIN_ONLY';
  end if;
  if length(v_reason) < 10 then raise exception 'MODERATION_REASON_REQUIRED'; end if;

  select * into v_product from public.products
  where id=p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  v_new_status := v_product.status;
  if p_action='approve' then
    if v_product.status <> 'pending_review' then raise exception 'PRODUCT_NOT_PENDING'; end if;
    v_new_status := 'active';
  elsif p_action='request_revision' then
    if v_product.status <> 'pending_review' then raise exception 'PRODUCT_NOT_PENDING'; end if;
    v_new_status := 'rejected';
  elsif p_action='warn' then
    null;
  elsif p_action='suspend' then
    if v_product.status in ('banned','archived') then raise exception 'INVALID_MODERATION_STATE'; end if;
    v_new_status := 'suspended';
  elsif p_action='ban' then
    if v_product.status='banned' then raise exception 'PRODUCT_ALREADY_BANNED'; end if;
    v_new_status := 'banned';
  elsif p_action='restore' then
    if v_product.status not in ('suspended','banned') then raise exception 'PRODUCT_NOT_SUSPENDED'; end if;
    v_new_status := 'pending_review';
  else
    raise exception 'INVALID_MODERATION_ACTION';
  end if;

  update public.products
    set status=v_new_status, moderation_note=v_reason, updated_at=now()
    where id=p_product_id;

  insert into public.product_moderation_events(
    product_id,actor_id,action,reason,previous_status,new_status
  ) values (
    p_product_id,v_actor,p_action,v_reason,v_product.status,v_new_status
  );

  return jsonb_build_object(
    'productId',p_product_id,
    'action',p_action,
    'previousStatus',v_product.status,
    'status',v_new_status
  );
end;
$$;

revoke all on function public.admin_moderate_product(uuid,text,text) from public, anon;
grant execute on function public.admin_moderate_product(uuid,text,text) to authenticated;
