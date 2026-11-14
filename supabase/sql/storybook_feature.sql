-- NusantaraGift Storybook MVP
-- Stories reuse products (delivery_type = 'digital-audio') and the existing
-- products.status moderation workflow.

create table if not exists public.story_pages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  page_title text,
  body text not null,
  illustration_url text not null,
  audio_url text not null,
  audio_duration_seconds integer check (audio_duration_seconds is null or audio_duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_pages_product_page_unique unique (product_id, page_number)
);

create index if not exists story_pages_product_page_idx
  on public.story_pages(product_id, page_number);

alter table public.story_pages enable row level security;

drop policy if exists "Public can read pages of published stories" on public.story_pages;
create policy "Public can read pages of published stories"
  on public.story_pages for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = story_pages.product_id
        and p.delivery_type = 'digital-audio'
        and p.status = 'active'
    )
  );

drop policy if exists "Sellers manage pages of own stories" on public.story_pages;
create policy "Sellers manage pages of own stories"
  on public.story_pages for all to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = story_pages.product_id
        and p.seller_id = (select auth.uid())
        and p.delivery_type = 'digital-audio'
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = story_pages.product_id
        and p.seller_id = (select auth.uid())
        and p.delivery_type = 'digital-audio'
    )
  );

drop policy if exists "Admins manage all story pages" on public.story_pages;
create policy "Admins manage all story pages"
  on public.story_pages for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_id = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_id = 'admin'
    )
  );

-- Explicit grants are required because Data API exposure is not automatic
-- for newly created tables on current Supabase projects.
grant select on public.story_pages to anon, authenticated;
grant insert, update, delete on public.story_pages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-media', 'story-media', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "UMKM upload own story media" on storage.objects;
create policy "UMKM upload own story media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "UMKM update own story media" on storage.objects;
create policy "UMKM update own story media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "UMKM delete own story media" on storage.objects;
create policy "UMKM delete own story media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
