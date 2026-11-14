import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
async function sellerClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: fail("Silakan login terlebih dahulu.", 401) };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profileError) return { supabase, user: null, error: fail("Gagal memverifikasi akun.", 500) };
  if (profile?.role_id !== "umkm") return { supabase, user: null, error: fail("Fitur ini khusus akun UMKM.", 403) };
  const { data: seller, error: sellerError } = await supabase.from("seller_profiles").select("status").eq("user_id", user.id).maybeSingle();
  if (sellerError) return { supabase, user: null, error: fail("Gagal memverifikasi toko UMKM.", 500) };
  if (seller?.status !== "approved") return { supabase, user: null, error: fail("Toko UMKM harus berstatus disetujui.", 403) };
  return { supabase, user, error: null };
}
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function GET() {
  const auth = await sellerClient();
  if (auth.error || !auth.user) return auth.error ?? fail("Silakan login.", 401);
  const { data, error } = await auth.supabase.from("products")
    .select("id,slug,name,description,price,stock,status,moderation_note,created_at,metadata,story_pages(id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds)")
    .eq("seller_id", auth.user.id).eq("delivery_type", "digital-audio").order("created_at", { ascending: false });
  if (error) return fail("Gagal memuat cerita UMKM.", 500);
  const stories = await Promise.all((data ?? []).map(async (story) => {
    const pages = await Promise.all((story.story_pages ?? []).map(async (page: { illustration_url: string; audio_url: string; [key: string]: unknown }) => {
      const audio = await auth.supabase.storage.from("story-media").createSignedUrl(page.audio_url, 3600);
      return { ...page, illustration_path: page.illustration_url, audio_path: page.audio_url, illustration_url: page.illustration_url, audio_url: audio.data?.signedUrl ?? "" };
    }));
    return { ...story, pages: pages.sort((a, b) => Number((a as unknown as { page_number: number }).page_number) - Number((b as unknown as { page_number: number }).page_number)) };
  }));
  return NextResponse.json({ stories });
}

// Create a draft first. Files are uploaded directly from the browser to Storage,
// avoiding serverless request-body limits for audio recordings.
export async function POST(request: Request) {
  const auth = await sellerClient();
  if (auth.error || !auth.user) return auth.error ?? fail("Silakan login.", 401);
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const price = Number(body.price);
  const stock = Number(body.stock);
  const coverUrl = typeof body.coverUrl === "string" ? body.coverUrl.trim() : "";
  let cover: URL;
  try { cover = new URL(coverUrl); } catch { return fail("Masukkan URL cover yang valid."); }
  if (!Number.isSafeInteger(price) || price < 1000 || price > 100000000 || !Number.isSafeInteger(stock) || stock < 1 || stock > 10000 || cover.protocol !== "https:" || cover.username || cover.password) return fail("Harga, stok, atau URL cover tidak valid.");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const price = Number(body.price);
  const stock = Number(body.stock);
  const coverUrl = typeof body.coverUrl === "string" ? body.coverUrl.trim() : "";
  let cover: URL;
  try { cover = new URL(coverUrl); } catch { return fail("Masukkan URL cover yang valid."); }
  if (!Number.isSafeInteger(price) || price < 1000 || price > 100000000 || !Number.isSafeInteger(stock) || stock < 1 || stock > 10000 || cover.protocol !== "https:" || cover.username || cover.password) return fail("Harga, stok, atau URL cover tidak valid.");
  if (title.length < 3 || title.length > 120 || description.length < 20 || description.length > 2000) return fail("Judul harus 3–120 karakter dan deskripsi 20–2.000 karakter.");
  if (!["budaya", "dongeng", "inspirasi", "sejarah", "edukasi"].includes(category)) return fail("Kategori cerita tidak valid.");
  const { data: categoryRow } = await auth.supabase.from("categories").select("id").eq("slug", "cerita").maybeSingle();
  if (!categoryRow) return fail("Kategori Cerita belum tersedia pada database.", 500);
  const slug = slugify(title) + "-" + crypto.randomUUID().slice(0, 8);
  const { data, error } = await auth.supabase.from("products").insert({
    seller_id: auth.user.id, category_id: categoryRow.id, name: title, slug, description,
    price, stock, sku: "STORY-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    is_gift_card_enabled: false, status: "draft", delivery_type: "digital-audio",
    metadata: { story_category: category, region: "Indonesia", image: coverUrl, imageAlt: title, size: "0 halaman", summary: { type: "Cerita digital", format: "Buku cerita audio", unlock: "Berbayar" } },
  }).select("id,slug").single();
  if (error || !data) {
    console.error("Create story draft:", error);
    return fail("Draft cerita gagal dibuat.", 500);
  }
  return NextResponse.json({ productId: data.id, slug: data.slug }, { status: 201 });
}

// Commit uploaded page paths and move the story to the admin moderation queue.
export async function PUT(request: Request) {
  const auth = await sellerClient();
  if (auth.error || !auth.user) return auth.error ?? fail("Silakan login.", 401);
  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  const pages = body.pages;
  const category = typeof body.category === "string" ? body.category : "";
  if (!["budaya", "dongeng", "inspirasi", "sejarah", "edukasi"].includes(category)) return fail("Kategori cerita tidak valid.");
  if (!productId || !Array.isArray(pages) || pages.length < 1 || pages.length > 20) return fail("Data halaman cerita tidak valid.");
  const { data: product, error: productError } = await auth.supabase.from("products")
    .select("id,status,delivery_type").eq("id", productId).eq("seller_id", auth.user.id).maybeSingle();
  if (productError || !product || product.delivery_type !== "digital-audio" || product.status === "archived") return fail("Produk Cerita tidak ditemukan atau sudah diarsipkan.", 404);

  const rows = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as Record<string, unknown>;
    const title = typeof page.title === "string" ? page.title.trim().slice(0, 120) : "";
    const text = typeof page.body === "string" ? page.body.trim() : "";
    const imageUrl = typeof page.illustration_url === "string" ? page.illustration_url.trim() : "";
    const audioPath = typeof page.audio_url === "string" ? page.audio_url : "";
    const expectedPrefix = auth.user.id + "/" + productId + "/";
    let parsedImage: URL;
    try { parsedImage = new URL(imageUrl); } catch { return fail("Masukkan URL ilustrasi yang valid pada halaman " + (i + 1) + "."); }
    if (text.length < 10 || text.length > 5000 || parsedImage.protocol !== "https:" || parsedImage.username || parsedImage.password || !audioPath.startsWith(expectedPrefix)) return fail("Isi, URL ilustrasi HTTPS, atau lokasi audio halaman " + (i + 1) + " tidak valid.");
    const audio = await auth.supabase.storage.from("story-media").createSignedUrl(audioPath, 60);
    if (audio.error) return fail("Audio halaman " + (i + 1) + " belum berhasil diunggah.");
    const duration = Number(page.duration);
    rows.push({ product_id: productId, page_number: i + 1, page_title: title || null, body: text, illustration_url: imageUrl, audio_url: audioPath, audio_duration_seconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null });
  }
  const { error: insertError } = await auth.supabase.from("story_pages").upsert(rows, { onConflict: "product_id,page_number" });
  if (insertError) {
    console.error("Save story pages:", insertError);
    return fail("Halaman cerita gagal disimpan.", 500);
  }
  const { error: trimError } = await auth.supabase.from("story_pages").delete().eq("product_id", productId).gt("page_number", rows.length);
  if (trimError) return fail("Halaman cerita lama gagal diselaraskan.", 500);
  const { error: updateError } = await auth.supabase.from("products").update({
    status: "pending_review", price, stock, description: typeof body.description === "string" ? body.description.trim() : undefined, updated_at: new Date().toISOString(),
    metadata: { story_category: body.category, region: "Indonesia", image: coverUrl, imageAlt: "Cover cerita Nusantara", size: rows.length + " halaman", summary: { type: "Cerita digital", format: "Buku cerita audio", unlock: "Berbayar" } },
  }).eq("id", productId).eq("seller_id", auth.user.id);
  if (updateError) return fail("Cerita belum berhasil dikirim ke antrean admin.", 500);
  return NextResponse.json({ success: true, message: "Cerita berhasil dikirim untuk ditinjau admin." });
}

export async function DELETE(request: Request) {
  const auth = await sellerClient();
  if (auth.error || !auth.user) return auth.error ?? fail("Silakan login.", 401);
  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId) return fail("ID draft tidak valid.");
  const { error } = await auth.supabase.from("products").delete().eq("id", productId).eq("seller_id", auth.user.id).eq("delivery_type", "digital-audio").eq("status", "draft");
  if (error) return fail("Draft cerita gagal dibersihkan.", 500);
  return NextResponse.json({ success: true });
}
