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
    const audio = await supabase.storage.from("story-media").createSignedUrl(String(page.audio_url), 3600);
    return { ...page, illustration_url: String(page.illustration_url ?? ""), audio_url: audio.data?.signedUrl ?? "" };
  }));
}

export async function GET() {
  const auth = await adminClient();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("products")
    .select("id,slug,name,description,status,moderation_note,created_at,seller_id,story_pages(id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds)")
    .eq("delivery_type", "digital-audio").order("created_at", { ascending: false });
  if (error) return fail("Gagal memuat antrean cerita.", 500);
  const storyIds = (data ?? []).map((story) => story.id);
  const { data: events, error: eventError } = storyIds.length
    ? await auth.supabase.from("product_moderation_events")
        .select("id,product_id,actor_id,action,reason,previous_status,new_status,created_at")
        .in("product_id", storyIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (eventError) return fail("Gagal memuat riwayat kurasi cerita.", 500);
  const historyByStory = new Map<string, typeof events>();
  for (const event of events ?? []) {
    const list = historyByStory.get(event.product_id) ?? [];
    list.push(event);
    historyByStory.set(event.product_id, list);
  }
  const stories = await Promise.all((data ?? []).map(async (story) => ({
    ...story,
    moderation_history: historyByStory.get(story.id) ?? [],
    pages: (await withSignedMedia(auth.supabase, (story.story_pages ?? []) as Record<string, unknown>[])).sort((a, b) => Number((a as unknown as { page_number: number }).page_number) - Number((b as unknown as { page_number: number }).page_number)),
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
  if (status === "active" && body.reviewConfirmed !== true) return fail("Konfirmasi pemeriksaan seluruh teks, ilustrasi, dan audio wajib dilakukan sebelum publikasi.");
  const { data: story, error: findError } = await auth.supabase.from("products")
    .select("id,name,status,delivery_type").eq("id", id).eq("delivery_type", "digital-audio").maybeSingle();
  if (findError || !story) return fail("Cerita tidak ditemukan.", 404);
  if (status === "rejected" && note.length < 10) return fail("Tuliskan alasan penolakan minimal 10 karakter.");
  if (status === "active") {
    const { data: pages, error: pageError } = await auth.supabase.from("story_pages")
      .select("body,illustration_url,audio_url").eq("product_id", id).order("page_number", { ascending: true });
    if (pageError || !pages?.length || pages.length > 20) return fail("Cerita belum memiliki halaman yang lengkap.", 400);
    for (let index = 0; index < pages.length; index++) {
      const page = pages[index];
      let image: URL;
      try { image = new URL(page.illustration_url); } catch { return fail("Ilustrasi halaman " + (index + 1) + " tidak valid.", 400); }
      if (image.protocol !== "https:" || !page.body?.trim() || page.body.trim().length < 10) return fail("Konten atau ilustrasi halaman " + (index + 1) + " belum memenuhi syarat.", 400);
      const audio = await auth.supabase.storage.from("story-media").createSignedUrl(page.audio_url, 60);
      if (audio.error || !audio.data?.signedUrl) return fail("Audio halaman " + (index + 1) + " belum tersedia.", 400);
    }
  }
  const action = status === "active" ? "approve" : "request_revision";
  const reason = status === "active"
    ? (note.length >= 10 ? note : "Cerita lolos pemeriksaan teks, ilustrasi, dan audio.")
    : note;
  const { data: result, error: moderationError } = await auth.supabase.rpc("admin_moderate_product", {
    p_product_id: id,
    p_action: action,
    p_reason: reason.slice(0, 500),
  });
  if (moderationError) {
    console.error("Moderasi cerita:", moderationError);
    const code = moderationError.message.includes("ADMIN_ONLY") ? 403
      : moderationError.message.includes("PRODUCT_NOT_FOUND") ? 404 : 400;
    return fail(code === 403 ? "Akses khusus moderator." : "Status cerita gagal diperbarui.", code);
  }
  return NextResponse.json({ success: true, result });
}
