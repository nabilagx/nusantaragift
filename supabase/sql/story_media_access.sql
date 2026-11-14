-- Story illustrations are hosted externally; this bucket is audio-only.
-- Keep draft/revision audio private. Public signed URLs can be issued only for
-- audio files belonging to published stories.
drop policy if exists "Public can read media for published stories" on storage.objects;
create policy "Public can read audio for published stories"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'story-media'
  and exists (
    select 1
    from public.story_pages sp
    join public.products p on p.id = sp.product_id
    where sp.audio_url = storage.objects.name
      and p.delivery_type = 'digital-audio'
      and p.status = 'active'
  )
);
update storage.buckets
set allowed_mime_types = array['audio/aac','audio/mp4','audio/mpeg','audio/wav','audio/webm','audio/x-m4a']
where id = 'story-media';
