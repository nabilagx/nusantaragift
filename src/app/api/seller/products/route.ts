import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function normalizeImageUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Masukkan URL gambar yang valid."); }
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("URL gambar harus menggunakan HTTP atau HTTPS.");
  if (url.hostname === "drive.google.com" || url.hostname === "www.drive.google.com") {
    const id = url.searchParams.get("id") || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    if (!id) throw new Error("Link Google Drive tidak dikenali. Gunakan link berbagi file gambar.");
    return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1200";
  }
  if (url.hostname === "imgur.com" || url.hostname === "www.imgur.com") {
    const id = url.pathname.split("/").filter(Boolean).pop()?.replace(/\.[^.]+$/, "");
    if (!id) throw new Error("Link Imgur tidak dikenali.");
    return "https://i.imgur.com/" + id + ".jpg";
  }
  return url.toString();
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });
  const { data, error } = await supabase.from("products").select("id,name,slug,description,price,stock,status,moderation_note,created_at,metadata,categories(name)").eq("seller_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Gagal mengambil produk." }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });
  const { data: seller } = await supabase.from("seller_profiles").select("status").eq("user_id", user.id).single();
  if (seller?.status !== "approved") return NextResponse.json({ error: "Profil UMKM belum disetujui." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const categorySlug = typeof body.category === "string" ? body.category : "";
  const imageInput = typeof body.imageUrl === "string" ? body.imageUrl : "";
  let image = "";
  try { image = normalizeImageUrl(imageInput); } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"URL gambar tidak valid."},{status:400}); }
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (name.length < 3 || description.length < 10 || !["cerita","rasa","budaya"].includes(categorySlug) || !Number.isSafeInteger(price) || price < 1 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Lengkapi nama, deskripsi (minimal 10 karakter), kategori, harga, dan stok dengan benar." }, { status: 400 });
  }
  const { data: category } = await supabase.from("categories").select("id").eq("slug", categorySlug).single();
  if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0,6)}`;
  const metadata = { region:"Indonesia", size:"1 Paket", image, imageAlt:name, summary:{type:categorySlug,format:"Produk UMKM",unlock:"Fisik"} };
  const { data, error } = await supabase.from("products").insert({
    seller_id:user.id, category_id:category.id, name, slug, description, price, stock,
    sku:`UMKM-${crypto.randomUUID().slice(0,8).toUpperCase()}`, status:"pending_review",
    delivery_type:"physical", metadata,
  }).select("id,name,slug,price,stock,status,metadata").single();
  if (error) {
    console.error("Seller product create:", error);
    return NextResponse.json({ error:"Produk gagal diajukan. Periksa kembali data produk." }, { status:400 });
  }
  return NextResponse.json({ product:data }, { status:201 });
}


export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });
  const { data: seller } = await supabase.from("seller_profiles").select("status").eq("user_id", user.id).single();
  if (seller?.status !== "approved") return NextResponse.json({ error: "Profil UMKM belum disetujui." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action : "update";
  if (!id) return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });

  const { data: current, error: findError } = await supabase.from("products")
    .select("id,name,status,stock").eq("id", id).eq("seller_id", user.id).maybeSingle();
  if (findError || !current) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

  if (action === "archive" || action === "restore") {
    const nextStatus = action === "archive" ? "archived" : "pending_review";
    const { data, error } = await supabase.from("products")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id).eq("seller_id", user.id)
      .select("id,name,status,stock").single();
    if (error) return NextResponse.json({ error: "Status produk gagal diperbarui." }, { status: 400 });
    return NextResponse.json({ product: data });
  }

  if (action === "stock") {
    const delta = Number(body.delta);
    if (!Number.isInteger(delta) || ![-1, 1].includes(delta)) return NextResponse.json({ error: "Perubahan stok tidak valid." }, { status: 400 });
    const nextStock = Number(current.stock) + delta;
    if (nextStock < 0) return NextResponse.json({ error: "Stok tidak boleh kurang dari nol." }, { status: 400 });
    const { data, error } = await supabase.from("products").update({ stock: nextStock, updated_at: new Date().toISOString() })
      .eq("id", id).eq("seller_id", user.id).select("id,name,status,stock").single();
    if (error) return NextResponse.json({ error: "Stok gagal diperbarui." }, { status: 400 });
    return NextResponse.json({ product: data });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const categorySlug = typeof body.category === "string" ? body.category : "";
  const price = Number(body.price);
  const stock = Number(body.stock);
  let image = "";
  try { image = normalizeImageUrl(typeof body.imageUrl === "string" ? body.imageUrl : ""); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "URL gambar tidak valid." }, { status: 400 }); }
  if (name.length < 3 || description.length < 10 || !["cerita","rasa","budaya"].includes(categorySlug) ||
      !Number.isSafeInteger(price) || price < 1 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Lengkapi nama, deskripsi (minimal 10 karakter), kategori, harga, dan stok." }, { status: 400 });
  }
  const { data: category } = await supabase.from("categories").select("id").eq("slug", categorySlug).single();
  if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
  const previousMetadata = current as typeof current & { metadata?: Record<string, unknown> };
  const metadata = { ...(previousMetadata.metadata ?? {}), region: "Indonesia", size: "1 Paket", image, imageAlt: name,
    summary: { type: categorySlug, format: "Produk UMKM", unlock: "Fisik" } };
  const { data, error } = await supabase.from("products").update({
    name, description, category_id: category.id, price, stock, metadata, updated_at: new Date().toISOString(),
  }).eq("id", id).eq("seller_id", user.id)
    .select("id,name,slug,price,stock,status,metadata").single();
  if (error) return NextResponse.json({ error: "Perubahan produk gagal disimpan." }, { status: 400 });
  return NextResponse.json({ product: data });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });
  const { data: product, error } = await supabase.from("products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id).eq("seller_id", user.id)
    .select("id,name,status").maybeSingle();
  if (error) return NextResponse.json({ error: "Produk gagal diarsipkan." }, { status: 400 });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ product, archived: true });
}
