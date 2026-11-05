import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login tidak ditemukan. Silakan login ulang." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Gagal memverifikasi role admin." }, { status: 500 });
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akun ini bukan administrator." }, { status: 403 });

  const [productResult, orderResult] = await Promise.all([
    supabase.from("products").select("id,name,slug,description,price,stock,status,created_at,seller_id,category_id").eq("status", "pending_review").order("created_at", { ascending: true }),
    supabase.from("orders").select("id,order_number,recipient_name,recipient_phone,shipping_address,subtotal,gift_card_fee,shipping_cost,total_amount,order_status,payment_status,shipping_quote_status,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (productResult.error) {
    console.error("Admin products query:", productResult.error);
    return NextResponse.json({ error: `Gagal memuat antrean produk: ${productResult.error.message}` }, { status: 500 });
  }
  if (orderResult.error) {
    console.error("Admin orders query:", orderResult.error);
    return NextResponse.json({ error: `Gagal memuat pesanan: ${orderResult.error.message}` }, { status: 500 });
  }

  const products = productResult.data ?? [];
  const orders = orderResult.data ?? [];
  const sellerIds = [...new Set(products.map(p => p.seller_id).filter(Boolean))];
  const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))];
  const orderIds = orders.map(o => o.id);
  const [sellerResult, categoryResult, itemResult] = await Promise.all([
    sellerIds.length ? supabase.from("seller_profiles").select("user_id,business_name").in("user_id", sellerIds) : Promise.resolve({ data: [], error: null }),
    categoryIds.length ? supabase.from("categories").select("id,name").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("order_items").select("order_id,product_name,quantity,line_total").in("order_id", orderIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (sellerResult.error || categoryResult.error || itemResult.error) {
    console.error("Admin relation queries:", sellerResult.error || categoryResult.error || itemResult.error);
    return NextResponse.json({ error: "Gagal memuat detail relasi produk atau pesanan." }, { status: 500 });
  }

  const sellers = new Map((sellerResult.data ?? []).map(x => [x.user_id, x.business_name]));
  const categories = new Map((categoryResult.data ?? []).map(x => [x.id, x.name]));
  const items = new Map<string, { product_name: string; quantity: number; line_total: number }[]>();
  for (const item of itemResult.data ?? []) {
    const list = items.get(item.order_id) ?? [];
    list.push({ product_name: item.product_name, quantity: item.quantity, line_total: Number(item.line_total) });
    items.set(item.order_id, list);
  }

  return NextResponse.json({
    products: products.map(p => ({ ...p, price: Number(p.price), seller_name: sellers.get(p.seller_id) ?? "Mitra UMKM", category_name: categories.get(p.category_id) ?? "Tanpa kategori" })),
    orders: orders.map(o => ({ ...o, subtotal: Number(o.subtotal), gift_card_fee: Number(o.gift_card_fee), shipping_cost: Number(o.shipping_cost), total_amount: Number(o.total_amount), order_items: items.get(o.id) ?? [] })),
  });
}
