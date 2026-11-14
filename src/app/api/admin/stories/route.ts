import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: fail("Silakan login.", 401) };
  const { data: profile, error } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (error) return { supabase, user: null, error: fail("Gagal memverifikasi akun admin.", 500) };
  if (profile?.role_id !== "admin") return { supabase, user: null, error: fail("Akses khusus admin.", 403) };
  return { supabase, user, error: null };
}

async function withSignedMedia(supabase: Awaited<ReturnType<typeof createClient>>, pages: Record<string, unknown>[]) {
  return Promise.all(pages.map(async (page) => {
    const [image, audio] = await Promise.all([
      supabase.storage.from("story-media").createSignedUrl(String(page.illustration_url), 3600),
      supabase.storage.from("story-media").createSignedUrl(String(page.audio_url), 3600),
    ]);
    return { ...page, illustration_url: image.data?.signedUrl ?? "", audio_url: audio.data?.signedUrl ?? "" };
  }));
}

export async function GET() {
  const auth = await adminClient();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("products")
    .select("id,slug,name,description,status,moderation_note,created_at,seller_id,story_pages(id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds)")
    .eq("delivery_type", "digital-audio").order("created_at", { ascending: false });
  if (error) return fail("Gagal memuat antrean cerita.", 500);
  const stories = await Promise.all((data ?? []).map(async (story) => ({
    ...story,
    pages: (await withSignedMedia(auth.supabase, (story.story_pages ?? []) as Record<string, unknown>[])).sort((a, b) => Number(a["page_number"]) - Number(b["page_number"])),
  })));
  return NextResponse.json({ stories });
}

export async function PATCH(request: Request) {
  const auth = await adminClient();
  if (auth.error || !auth.user) return auth.error ?? fail("Silakan login.", 401);
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!id || !["active", "rejected"].includes(status)) return fail("Data moderasi tidak valid.");
  const { data: story, error: findError } = await auth.supabase.from("products")
    .select("id,name,status,delivery_type").eq("id", id).eq("delivery_type", "digital-audio").maybeSingle();
  if (findError || !story) return fail("Cerita tidak ditemukan.", 404);
  if (status === "rejected" && note.length < 5) return fail("Tuliskan alasan penolakan minimal 5 karakter.");
  const { data, error } = await auth.supabase.from("products")
    .update({ status, moderation_note: status === "rejected" ? note : null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("delivery_type", "digital-audio")
    .select("id,name,slug,status,moderation_note").single();
  if (error) return fail("Status cerita gagal diperbarui.", 500);
  return NextResponse.json({ story: data });
}
