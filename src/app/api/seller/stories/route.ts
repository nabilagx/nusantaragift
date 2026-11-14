import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_FILE = 15 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const audioTypes = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a", "audio/aac"]);
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Silakan login terlebih dahulu.", 401);
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profile?.role_id !== "umkm") return jsonError("Fitur ini khusus akun UMKM.", 403);
  const { data, error } = await supabase.from("products")
    .select("id,slug,name,description,status,moderation_note,created_at,story_pages(id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds)")
    .eq("seller_id", user.id).eq("delivery_type", "digital-audio")
    .order("created_at", { ascending: false });
  if (error) return jsonError("Gagal memuat cerita UMKM.", 500);
  const stories = await Promise.all((data ?? []).map(async (story) => {
    const pages = await Promise.all((story.story_pages ?? []).map(async (page: { illustration_url: string; audio_url: string; [key: string]: unknown }) => {
      const [image, audio] = await Promise.all([
        supabase.storage.from("story-media").createSignedUrl(page.illustration_url, 3600),
        supabase.storage.from("story-media").createSignedUrl(page.audio_url, 3600),
      ]);
      return { ...page, illustration_url: image.data?.signedUrl ?? "", audio_url: audio.data?.signedUrl ?? "" };
    }));
    return { ...story, pages: pages.sort((a, b) => Number(a.page_number) - Number(b.page_number)) };
  }));
  return NextResponse.json({ stories });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Silakan login terlebih dahulu.", 401);
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profile?.role_id !== "umkm") return jsonError("Fitur ini khusus akun UMKM.", 403);
  const { data: seller } = await supabase.from("seller_profiles").select("status").eq("user_id", user.id).maybeSingle();
  if (seller?.status !== "approved") return jsonError("Toko UMKM harus berstatus disetujui sebelum mengirim cerita.", 403);

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "budaya").trim();
  let pageInput: unknown;
  try { pageInput = JSON.parse(String(form.get("pages") ?? "[]")); } catch { return jsonError("Format halaman cerita tidak valid."); }
  if (title.length < 3 || title.length > 120 || description.length < 20 || description.length > 2000) return jsonError("Judul harus 3–120 karakter dan deskripsi 20–2.000 karakter.");
  if (!["budaya", "dongeng", "inspirasi", "sejarah", "edukasi"].includes(category)) return jsonError("Kategori cerita tidak valid.");
  if (!Array.isArray(pageInput) || pageInput.length < 1 || pageInput.length > 20) return jsonError("Cerita harus memiliki 1–20 halaman.");

  const pages = pageInput as { title?: unknown; body?: unknown; duration?: unknown }[];
  const files: { image: File; audio: File; title: string; body: string; duration: number | null }[] = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageTitle = typeof page.title === "string" ? page.title.trim() : "";
    const body = typeof page.body === "string" ? page.body.trim() : "";
    const image = form.get("image-" + i);
    const audio = form.get("audio-" + i);
    if (body.length < 10 || body.length > 5000) return jsonError("Teks halaman " + (i + 1) + " harus 10–5.000 karakter.");
    if (!(image instanceof File) || !imageTypes.has(image.type) || image.size > MAX_FILE) return jsonError("Ilustrasi halaman " + (i + 1) + " harus JPG, PNG, atau WebP maksimal 15 MB.");
    if (!(audio instanceof File) || !audioTypes.has(audio.type) || audio.size > MAX_FILE) return jsonError("Audio halaman " + (i + 1) + " harus MP3, M4A, AAC, atau WAV maksimal 15 MB.");
    const duration = Number(page.duration);
    files.push({ image, audio, title: pageTitle, body, duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null });
  }

  const { data: categoryRow } = await supabase.from("categories").select("id").eq("slug", "cerita").maybeSingle();
  if (!categoryRow) return jsonError("Kategori Cerita belum tersedia pada database.", 500);
  const slug = slugify(title) + "-" + crypto.randomUUID().slice(0, 8);
  const { data: product, error: productError } = await supabase.from("products").insert({
    seller_id: user.id, category_id: categoryRow.id, name: title, slug, description,
    price: 0, stock: 0, sku: "STORY-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    is_gift_card_enabled: false, status: "draft", delivery_type: "digital-audio",
    metadata: { story_category: category, region: "Indonesia", image: "", imageAlt: title, size: files.length + " halaman", summary: { type: "Cerita digital", format: "Buku cerita audio", unlock: "Gratis" } },
  }).select("id,slug").single();
  if (productError || !product) {
    console.error("Create story product:", productError);
    return jsonError("Cerita gagal dibuat. Periksa konfigurasi kategori dan database.", 500);
  }

  const uploaded: string[] = [];
  try {
    const rows = [];
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      const imageExt = item.image.type === "image/png" ? "png" : item.image.type === "image/webp" ? "webp" : "jpg";
      const audioExt = item.audio.type === "audio/mpeg" ? "mp3" : item.audio.type === "audio/wav" ? "wav" : item.audio.type === "audio/aac" ? "aac" : "m4a";
      const imagePath = user.id + "/" + product.id + "/" + (i + 1) + "-illustration-" + crypto.randomUUID() + "." + imageExt;
      const audioPath = user.id + "/" + product.id + "/" + (i + 1) + "-narration-" + crypto.randomUUID() + "." + audioExt;
      const [imageUpload, audioUpload] = await Promise.all([
        supabase.storage.from("story-media").upload(imagePath, item.image, { contentType: item.image.type, upsert: false }),
        supabase.storage.from("story-media").upload(audioPath, item.audio, { contentType: item.audio.type, upsert: false }),
      ]);
      if (imageUpload.error) throw new Error("Upload ilustrasi halaman " + (i + 1) + " gagal: " + imageUpload.error.message);
      uploaded.push(imagePath);
      if (audioUpload.error) throw new Error("Upload audio halaman " + (i + 1) + " gagal: " + audioUpload.error.message);
      uploaded.push(audioPath);
      rows.push({ product_id: product.id, page_number: i + 1, page_title: item.title || null, body: item.body, illustration_url: imagePath, audio_url: audioPath, audio_duration_seconds: item.duration });
    }
    const { error: pageError } = await supabase.from("story_pages").insert(rows);
    if (pageError) throw new Error("Halaman cerita gagal disimpan: " + pageError.message);
    const { error: updateError } = await supabase.from("products").update({ status: "pending_review", updated_at: new Date().toISOString() }).eq("id", product.id).eq("seller_id", user.id);
    if (updateError) throw new Error("Cerita tersimpan tetapi gagal dikirim ke antrean admin.");
    return NextResponse.json({ success: true, slug: product.slug, message: "Cerita berhasil dikirim untuk ditinjau admin." }, { status: 201 });
  } catch (error) {
    await supabase.storage.from("story-media").remove(uploaded);
    await supabase.from("products").delete().eq("id", product.id).eq("seller_id", user.id);
    console.error("Story upload:", error);
    return jsonError(error instanceof Error ? error.message : "Cerita gagal disimpan.", 500);
  }
}
