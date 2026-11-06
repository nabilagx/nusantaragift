import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_TITLE = 42;
const MAX_DESCRIPTION = 90;

function normalizeImageUrl(value: string) {
  const raw = value.trim();
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Masukkan URL gambar banner yang valid."); }
  if (url.protocol !== "https:") throw new Error("Gambar banner harus menggunakan HTTPS.");
  if (url.hostname === "drive.google.com" || url.hostname === "www.drive.google.com") {
    const id = url.searchParams.get("id") || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    if (!id) throw new Error("Link Google Drive tidak dikenali.");
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
  }
  if (url.hostname === "imgur.com" || url.hostname === "www.imgur.com") {
    const id = url.pathname.split("/").filter(Boolean).pop()?.replace(/\.[^.]+$/, "");
    if (!id) throw new Error("Link Imgur tidak dikenali.");
    return `https://i.imgur.com/${id}.jpg`;
  }
  return url.toString();
}

async function getSeller(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Silakan login." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "umkm") return { user: null, error: NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 }) };
  const { data: seller } = await supabase.from("seller_profiles").select("status").eq("user_id", user.id).single();
  if (seller?.status !== "approved") return { user: null, error: NextResponse.json({ error: "Toko harus disetujui sebelum memasang iklan." }, { status: 403 }) };
  return { user, error: null };
}

function parseCampaign(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const productIds = Array.isArray(body.productIds) ? [...new Set(body.productIds.filter((id): id is string => typeof id === "string"))] : [];
  if (title.length < 4 || title.length > MAX_TITLE || description.length < 8 || description.length > MAX_DESCRIPTION || productIds.length < 2 || productIds.length > 12) {
    throw new Error(`Judul harus 4–${MAX_TITLE} karakter, deskripsi 8–${MAX_DESCRIPTION} karakter, dan pilih 2–12 produk.`);
  }
  return { title, description, productIds };
}

async function validateProducts(supabase: Awaited<ReturnType<typeof createClient>>, sellerId: string, productIds: string[]) {
  const { data, error } = await supabase.from("products").select("id").eq("seller_id", sellerId).eq("status", "active").in("id", productIds);
  if (error || (data?.length ?? 0) !== productIds.length) return false;
  return true;
}

export async function GET() {
  const supabase = await createClient();
  const { user, error } = await getSeller(supabase);
  if (error || !user) return error!;
  const { data, error: queryError } = await supabase.from("promotions")
    .select("id,title,description,image_url,product_ids,status,moderation_note,reviewed_at,created_at,updated_at")
    .eq("seller_id", user.id).order("created_at", { ascending: false });
  if (queryError) return NextResponse.json({ error: "Iklan gagal dimuat." }, { status: 500 });
  return NextResponse.json({ promotions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, error } = await getSeller(supabase);
  if (error || !user) return error!;
  const body = await request.json().catch(() => ({}));
  let parsed: ReturnType<typeof parseCampaign>;
  let imageUrl = "";
  try {
    parsed = parseCampaign(body);
    imageUrl = normalizeImageUrl(typeof body.imageUrl === "string" ? body.imageUrl : "");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Data iklan tidak valid." }, { status: 400 });
  }
  if (!await validateProducts(supabase, user.id, parsed.productIds)) {
    return NextResponse.json({ error: "Pastikan semua produk yang dipilih aktif dan berasal dari toko kamu." }, { status: 400 });
  }
  const { data, error: insertError } = await supabase.from("promotions").insert({
    seller_id: user.id, title: parsed.title, description: parsed.description, image_url: imageUrl,
    product_ids: parsed.productIds, status: "pending_review",
  }).select("id,title,description,image_url,product_ids,status,created_at").single();
  if (insertError) {
    console.error("Create promotion:", insertError);
    return NextResponse.json({ error: "Pengajuan iklan gagal dibuat." }, { status: 400 });
  }
  return NextResponse.json({ promotion: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { user, error } = await getSeller(supabase);
  if (error || !user) return error!;
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "ID iklan tidak valid." }, { status: 400 });

  if (body.action === "pause") {
    const { data, error: updateError } = await supabase.from("promotions")
      .update({ status: "paused", moderation_note: "Banner diturunkan oleh pemilik toko.", reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
      .eq("id", body.id).eq("seller_id", user.id).eq("status", "active")
      .select("id,status").maybeSingle();
    if (updateError || !data) return NextResponse.json({ error: "Banner tidak ditemukan atau sudah tidak tayang." }, { status: 400 });
    return NextResponse.json({ promotion: data });
  }

  if (body.action !== "edit") return NextResponse.json({ error: "Aksi iklan tidak dikenali." }, { status: 400 });
  let parsed: ReturnType<typeof parseCampaign>;
  let imageUrl = "";
  try {
    parsed = parseCampaign(body);
    imageUrl = normalizeImageUrl(typeof body.imageUrl === "string" ? body.imageUrl : "");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Data iklan tidak valid." }, { status: 400 });
  }
  if (!await validateProducts(supabase, user.id, parsed.productIds)) {
    return NextResponse.json({ error: "Pastikan semua produk yang dipilih aktif dan berasal dari toko kamu." }, { status: 400 });
  }
  const { data, error: updateError } = await supabase.from("promotions").update({
    title: parsed.title, description: parsed.description, image_url: imageUrl, product_ids: parsed.productIds,
    status: "pending_review", moderation_note: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString(),
  }).eq("id", body.id).eq("seller_id", user.id)
    .select("id,title,description,image_url,product_ids,status,created_at").maybeSingle();
  if (updateError || !data) return NextResponse.json({ error: "Iklan gagal diperbarui. Pastikan iklan tersebut milik tokomu." }, { status: 400 });
  return NextResponse.json({ promotion: data });
}
