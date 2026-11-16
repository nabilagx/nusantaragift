begin;

-- Keep product writes limited to seller-editable fields. Moderation fields and
-- ownership metadata are written only by trusted server-side functions/triggers.
revoke insert, update on table public.products from authenticated;
revoke insert (
  id, seller_id, category_id, name, slug, description, price, compare_at_price,
  stock, sku, weight_gram, is_gift_card_enabled, status, moderation_note,
  created_at, updated_at, metadata, delivery_type
) on table public.products from authenticated;
revoke update (
  id, seller_id, category_id, name, slug, description, price, compare_at_price,
  stock, sku, weight_gram, is_gift_card_enabled, status, moderation_note,
  created_at, updated_at, metadata, delivery_type
) on table public.products from authenticated;

grant insert (
  seller_id, category_id, name, slug, description, price, compare_at_price,
  stock, sku, weight_gram, is_gift_card_enabled, status, delivery_type, metadata
) on table public.products to authenticated;

-- status remains available to the legacy seller API during rollout, but the
-- trigger below only permits safe seller transitions. moderation_note,
-- seller_id, id and created_at cannot be changed by an authenticated seller.
grant update (
  category_id, name, slug, description, price, compare_at_price, stock, sku,
  weight_gram, is_gift_card_enabled, status, updated_at, metadata, delivery_type
) on table public.products to authenticated;

drop policy if exists "Sellers can insert own products" on public.products;
create policy "Sellers can insert own products"
on public.products
for insert
to authenticated
with check (
  seller_id = (select auth.uid())
  and status in ('draft', 'pending_review')
  and moderation_note is null
  and exists (
    select 1
    from public.profiles p
    join public.seller_profiles sp on sp.user_id = p.id
    where p.id = (select auth.uid())
      and p.role_id = 'umkm'
      and sp.status = 'approved'
  )
);

drop policy if exists "Sellers can update own products" on public.products;
create policy "Sellers can update own products"
on public.products
for update
to authenticated
using (
  seller_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role_id = 'umkm'
  )
)
with check (
  seller_id = (select auth.uid())
  and status in ('draft', 'pending_review', 'rejected', 'active', 'archived', 'suspended', 'banned')
  and exists (
    select 1
    from public.profiles p
    join public.seller_profiles sp on sp.user_id = p.id
    where p.id = (select auth.uid())
      and p.role_id = 'umkm'
      and sp.status = 'approved'
  )
);

create or replace function public.guard_umkm_product_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_content_changed boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select p.role_id into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role <> 'umkm' or old.seller_id <> auth.uid() then
    return new;
  end if;

  -- A seller can never change ownership or overwrite moderator notes.
  new.seller_id := old.seller_id;
  new.moderation_note := old.moderation_note;

  v_content_changed :=
    row(
      new.category_id, new.name, new.slug, new.description, new.price,
      new.compare_at_price, new.stock, new.sku, new.weight_gram,
      new.is_gift_card_enabled, new.metadata, new.delivery_type
    ) is distinct from row(
      old.category_id, old.name, old.slug, old.description, old.price,
      old.compare_at_price, old.stock, old.sku, old.weight_gram,
      old.is_gift_card_enabled, old.metadata, old.delivery_type
    );

  -- Sellers may archive their own listing or resubmit an editable draft,
  -- rejected, active, or archived listing. They cannot publish, reject,
  -- suspend, or ban a listing themselves.
  if new.status is distinct from old.status then
    if old.status in ('suspended', 'banned') then
      new.status := old.status;
    elsif new.status = 'archived'
      and old.status in ('draft', 'pending_review', 'rejected', 'active') then
      null;
    elsif new.status = 'pending_review'
      and old.status in ('draft', 'rejected', 'active', 'archived') then
      null;
    else
      new.status := old.status;
    end if;
  end if;

  -- Any content edit to a published or rejected product returns it to review.
  -- A seller edit never lifts a moderator suspension or ban.
  if v_content_changed and old.status in ('active', 'rejected') then
    new.status := 'pending_review';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_umkm_product_moderation_fields() from public, anon, authenticated;
drop trigger if exists trg_guard_umkm_product_moderation_fields on public.products;
create trigger trg_guard_umkm_product_moderation_fields
before update on public.products
for each row
execute function public.guard_umkm_product_moderation_fields();

-- Moderators need to inspect all listing photos, including products that are
-- still waiting for curation or have been suspended/banned.
drop policy if exists "Admins read all product images" on public.product_images;
create policy "Admins read all product images"
on public.product_images
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role_id = 'admin'
  )
);

-- Moderation events are immutable to clients. Only the SECURITY DEFINER
-- moderation function may create audit entries.
revoke insert, update, delete on table public.product_moderation_events from authenticated;
grant select on table public.product_moderation_events to authenticated;

revoke all on function public.admin_moderate_product(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_product(uuid, text, text) to authenticated;

commit;
