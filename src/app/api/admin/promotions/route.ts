import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, response: NextResponse.json({ error: "Silakan login." }, { status: 401 }) };
  const { data: profile, error } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (error || profile?.role_id !== "admin") return { supabase, user: null, response: NextResponse.json({ error: "Akses khusus administrator." }, { status: 403 }) };
  return { supabase, user, response: null };
}

export async function GET() {
  const { supabase, response } = await getAdmin();
  if (response) return response;
  const { data: promotions, error } = await supabase.from("promotions")
    .select("id,seller_id,title,description,image_url,product_ids,status,moderation_note,created_at,updated_at,reviewed_at")
    .order("created_at", { ascending: false }).limit(200);
  if (error) {
    console.error("Admin promotions:", error);
    return NextResponse.json({ error: "Daftar iklan gagal dimuat." }, { status: 500 });
  }
  const sellerIds = [...new Set((promotions ?? []).map(item => item.seller_id))];
  const productIds = [...new Set((promotions ?? []).flatMap(item => item.product_ids ?? []))];
  const [sellerResult, productResult] = await Promise.all([
    sellerIds.length ? supabase.from("seller_profiles").select("user_id,business_name").in("user_id", sellerIds) : Promise.resolve({ data: [], error: null }),
    productIds.length ? supabase.from("products").select("id,name,price,stock,status,metadata").in("id", productIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (sellerResult.error || productResult.error) return NextResponse.json({ error: "Detail toko atau produk iklan gagal dimuat." }, { status: 500 });
  const sellers = new Map((sellerResult.data ?? []).map(item => [item.user_id, item.business_name]));
  const products = new Map((productResult.data ?? []).map(item => [item.id, item]));
  const result = (promotions ?? []).map(item => ({
    ...item,
    seller_name: sellers.get(item.seller_id) ?? "UMKM",
    products: (item.product_ids ?? []).map((id: string) => products.get(id)).filter(Boolean),
  }));
  return NextResponse.json({ promotions: result });
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await getAdmin();
  if (response || !user) return response!;
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!id || !["active", "rejected"].includes(status)) return NextResponse.json({ error: "Keputusan kurasi tidak valid." }, { status: 400 });
  if (status === "rejected" && note.length < 12) return NextResponse.json({ error: "Alasan penolakan wajib diisi minimal 12 karakter agar UMKM dapat memperbaiki iklannya." }, { status: 400 });
  if (note.length > 500) return NextResponse.json({ error: "Alasan kurasi maksimal 500 karakter." }, { status: 400 });
  const { data, error } = await supabase.from("promotions").update({
    status, moderation_note: status === "rejected" ? note : null,
    reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending_review")
    .select("id,status,moderation_note,reviewed_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Iklan tidak ditemukan atau sudah ditinjau oleh Admin lain." }, { status: 400 });
  return NextResponse.json({ promotion: data });
}
