-- Seller promotions / marketplace banner ads
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  title varchar(100) not null,
  description text not null default '',
  image_url text not null,
  product_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists promotions_seller_id_idx on public.promotions(seller_id);
create index if not exists promotions_status_created_idx on public.promotions(status, created_at desc);
alter table public.promotions enable row level security;
drop policy if exists "Public can view active promotions" on public.promotions;
create policy "Public can view active promotions" on public.promotions for select to anon, authenticated using (status = 'active');
drop policy if exists "Sellers can view own promotions" on public.promotions;
create policy "Sellers can view own promotions" on public.promotions for select to authenticated using (seller_id = (select auth.uid()));
drop policy if exists "Approved sellers can create promotions" on public.promotions;
create policy "Approved sellers can create promotions" on public.promotions for insert to authenticated with check (
  seller_id = (select auth.uid()) and exists (
    select 1 from public.profiles p join public.seller_profiles s on s.user_id = p.id
    where p.id = (select auth.uid()) and p.role_id = 'umkm' and s.status = 'approved'
  )
);
drop policy if exists "Sellers can update own promotions" on public.promotions;
create policy "Sellers can update own promotions" on public.promotions for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
grant select on public.promotions to anon, authenticated;
grant insert, update on public.promotions to authenticated;
