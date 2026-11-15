import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login tidak ditemukan. Silakan login ulang." }, { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Gagal memverifikasi role admin." }, { status: 500 });
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akun ini bukan administrator." }, { status: 403 });

  const { data: notifications, error: notificationError } = await supabase.from("notifications").select("id,title,message,type,is_read,created_at").eq("user_id", user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(10);
  if (notificationError) return NextResponse.json({ error: "Gagal memuat notifikasi admin." }, { status: 500 });

  const [pendingResult, orderResult, productStatsResult, sellerResult] = await Promise.all([
    supabase.from("products").select("id,name,slug,description,price,stock,status,created_at,seller_id,category_id,metadata").eq("status", "pending_review").order("created_at", { ascending: true }),
    supabase.from("orders").select("id,order_number,recipient_name,recipient_phone,shipping_address,subtotal,gift_card_fee,shipping_cost,total_amount,order_status,payment_status,shipping_quote_status,payment_method,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("products").select("id,name,slug,description,price,stock,status,created_at,seller_id,category_id,metadata"),
    supabase.from("seller_profiles").select("user_id,business_name,slug,description,status,created_at"),
  ]);
  for (const [name, result] of [["moderasi",pendingResult],["pesanan",orderResult],["statistik produk",productStatsResult],["mitra",sellerResult]] as const) {
    if (result.error) {
      console.error("Admin overview "+name+":", result.error);
      return NextResponse.json({ error: "Gagal memuat "+name+"." }, { status: 500 });
    }
  }
  const pending = pendingResult.data ?? [];
  const orders = orderResult.data ?? [];
  const allProducts = productStatsResult.data ?? [];
  const sellers = sellerResult.data ?? [];
  const sellerIds = [...new Set(allProducts.map(p => p.seller_id).filter(Boolean))];
  const categoryIds = [...new Set(allProducts.map(p => p.category_id).filter(Boolean))];
  const orderIds = orders.map(o => o.id);
  const [sellerNames, categoryNames, itemResult] = await Promise.all([
    sellerIds.length ? supabase.from("seller_profiles").select("user_id,business_name").in("user_id", sellerIds) : Promise.resolve({ data: [], error: null }),
    categoryIds.length ? supabase.from("categories").select("id,name").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("order_items").select("order_id,product_id,product_name,quantity,line_total").in("order_id", orderIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (sellerNames.error || categoryNames.error || itemResult.error) return NextResponse.json({ error: "Gagal memuat detail katalog atau transaksi." }, { status: 500 });

  const sellerMap = new Map((sellerNames.data ?? []).map(x => [x.user_id, x.business_name]));
  const categoryMap = new Map((categoryNames.data ?? []).map(x => [x.id, x.name]));
  const items = new Map<string, { product_name: string; quantity: number; line_total: number }[]>();
  for (const item of itemResult.data ?? []) {
    const list = items.get(item.order_id) ?? [];
    list.push({ product_name: item.product_name, quantity: item.quantity, line_total: Number(item.line_total) });
    items.set(item.order_id, list);
  }
  const normalizedOrders = orders.map(o => ({ ...o, subtotal:Number(o.subtotal), gift_card_fee:Number(o.gift_card_fee), shipping_cost:Number(o.shipping_cost), total_amount:Number(o.total_amount), order_items:items.get(o.id) ?? [] }));
  const paid = normalizedOrders.filter(o => o.payment_status === "paid");
  const paidOrderIds = new Set(paid.map(o => o.id));
  const salesByProduct = new Map<string, number>();
  for (const item of itemResult.data ?? []) {
    if (item.product_id && paidOrderIds.has(item.order_id)) salesByProduct.set(item.product_id, (salesByProduct.get(item.product_id) ?? 0) + Number(item.quantity ?? 0));
  }
  const now = new Date();
  const trend = Array.from({length:7}, (_, index) => {
    const day = new Date(now);
    day.setHours(0,0,0,0);
    day.setDate(day.getDate() - (6-index));
    const key = day.toISOString().slice(0,10);
    const daily = paid.filter(o => o.created_at.slice(0,10) === key);
    return { date:key, label:day.toLocaleDateString("id-ID",{weekday:"short"}), orders:daily.length, revenue:daily.reduce((sum,o)=>sum+o.total_amount,0) };
  });
  return NextResponse.json({
    notifications: notifications ?? [],
    products: pending.map(p => ({...p,price:Number(p.price),seller_name:sellerMap.get(p.seller_id) ?? "Mitra UMKM",category_name:categoryMap.get(p.category_id) ?? "Tanpa kategori"})),
    catalog: allProducts.map(p => ({...p,price:Number(p.price),sales_count:salesByProduct.get(p.id) ?? 0,seller_name:sellerMap.get(p.seller_id) ?? "Mitra UMKM",category_name:categoryMap.get(p.category_id) ?? "Tanpa kategori"})),
    orders: normalizedOrders,
    metrics: {
      totalOrders: normalizedOrders.length, paidOrders: paid.length,
      pendingShipping: normalizedOrders.filter(o=>o.payment_status==="pending"&&o.shipping_quote_status==="pending").length,
      revenue: paid.reduce((sum,o)=>sum+o.total_amount,0),
      totalProducts: allProducts.length, activeProducts: allProducts.filter(p=>p.status==="active").length,
      pendingProducts: allProducts.filter(p=>p.status==="pending_review").length,
      lowStock: allProducts.filter(p=>p.status==="active"&&p.stock<=5).length,
      totalSellers: sellers.length, activeSellers: sellers.filter(s=>s.status==="approved").length,
    },
    trend,
    sellers: sellers.map(s=>({user_id:s.user_id,name:s.business_name,slug:s.slug,description:s.description,status:s.status,created_at:s.created_at})),
  });
}


export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akses khusus moderator." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (body.action !== "mark_notification_read" || typeof body.notificationId !== "string") {
    return NextResponse.json({ error: "Admin hanya memiliki akses baca katalog. Gunakan alur moderasi untuk tindakan produk." }, { status: 403 });
  }
  const { data, error } = await supabase.from("notifications").update({ is_read: true })
    .eq("id", body.notificationId).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Notifikasi gagal diperbarui." }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  return NextResponse.json({ error: "Penghapusan produk tidak tersedia bagi moderator." }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ error: "Pembuatan produk dilakukan oleh mitra UMKM." }, { status: 405 });
}
