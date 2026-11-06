import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function GET() {
  const supabase = await createClient();
  const { user, error } = await getSeller(supabase);
  if (error || !user) return error!;
  const { data, error: queryError } = await supabase.from("promotions")
    .select("id,title,description,image_url,product_ids,status,created_at")
    .eq("seller_id", user.id).order("created_at", { ascending: false });
  if (queryError) return NextResponse.json({ error: "Iklan gagal dimuat." }, { status: 500 });
  return NextResponse.json({ promotions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, error } = await getSeller(supabase);
  if (error || !user) return error!;
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const productIds = Array.isArray(body.productIds) ? [...new Set(body.productIds.filter((id: unknown) => typeof id === "string"))] : [];
  let imageUrl = "";
  try { imageUrl = normalizeImageUrl(typeof body.imageUrl === "string" ? body.imageUrl : ""); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "URL gambar tidak valid." }, { status: 400 }); }
  if (title.length < 4 || description.length < 8 || productIds.length < 2 || productIds.length > 12) {
    return NextResponse.json({ error: "Isi judul (minimal 4 karakter), deskripsi, dan pilih 2–12 produk untuk satu iklan." }, { status: 400 });
  }
  const { data: ownedProducts, error: productError } = await supabase.from("products")
    .select("id").eq("seller_id", user.id).eq("status", "active").in("id", productIds);
  if (productError || (ownedProducts?.length ?? 0) !== productIds.length) {
    return NextResponse.json({ error: "Pastikan semua produk yang dipilih aktif dan berasal dari toko kamu." }, { status: 400 });
  }
  const { data, error: insertError } = await supabase.from("promotions").insert({
    seller_id: user.id, title, description, image_url: imageUrl, product_ids: productIds, status: "active",
  }).select("id,title,description,image_url,product_ids,status,created_at").single();
  if (insertError) {
    console.error("Create promotion:", insertError);
    return NextResponse.json({ error: "Iklan gagal dibuat." }, { status: 400 });
  }
  return NextResponse.json({ promotion: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { user, error } = await getSeller(supabase);
  if (error || !user) return error!;
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || !["active", "paused"].includes(body.status)) {
    return NextResponse.json({ error: "Data perubahan iklan tidak valid." }, { status: 400 });
  }
  const { data, error: updateError } = await supabase.from("promotions")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id).eq("seller_id", user.id)
    .select("id,status").maybeSingle();
  if (updateError || !data) return NextResponse.json({ error: "Status iklan gagal diperbarui." }, { status: 400 });
  return NextResponse.json({ promotion: data });
}
