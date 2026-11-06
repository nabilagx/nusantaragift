-- Promotion moderation workflow
alter table public.promotions
  drop constraint if exists promotions_status_check;
alter table public.promotions
  add constraint promotions_status_check
  check (status in ('pending_review','active','paused','rejected'));
alter table public.promotions
  add column if not exists moderation_note text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

drop policy if exists "Approved sellers can create promotions" on public.promotions;
create policy "Approved sellers can submit promotions for review"
on public.promotions for insert to authenticated
with check (
  seller_id = (select auth.uid())
  and status = 'pending_review'
  and exists (
    select 1 from public.profiles p
    join public.seller_profiles s on s.user_id = p.id
    where p.id = (select auth.uid()) and p.role_id = 'umkm' and s.status = 'approved'
  )
);

drop policy if exists "Sellers can update own promotions" on public.promotions;
create policy "Sellers can edit or pause own promotions"
on public.promotions for update to authenticated
using (seller_id = (select auth.uid()))
with check (seller_id = (select auth.uid()) and status in ('pending_review','paused'));

drop policy if exists "Admins can view all promotions" on public.promotions;
create policy "Admins can view all promotions"
on public.promotions for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'));

drop policy if exists "Admins can review promotions" on public.promotions;
create policy "Admins can review promotions"
on public.promotions for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_id = 'admin'));

grant select on public.promotions to anon, authenticated;
grant insert, update on public.promotions to authenticated;
revoke delete on public.promotions from anon, authenticated;
