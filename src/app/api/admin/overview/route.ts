import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login tidak ditemukan. Silakan login ulang." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Gagal memverifikasi role admin." }, { status: 500 });
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akun ini bukan administrator." }, { status: 403 });

  const { data: notifications, error: notificationError } = await supabase
    .from("notifications").select("id,title,message,type,is_read,created_at")
    .eq("user_id", user.id).eq("is_read", false)
    .order("created_at", { ascending: false }).limit(10);
  if (notificationError) return NextResponse.json({ error: "Gagal memuat notifikasi admin." }, { status: 500 });

  const [pendingResult, orderResult, productStatsResult, sellerResult] = await Promise.all([
    supabase.from("products")
      .select("id,name,slug,description,price,compare_at_price,stock,sku,weight_gram,status,moderation_note,created_at,seller_id,category_id,metadata,delivery_type,is_gift_card_enabled")
      .eq("status", "pending_review").order("created_at", { ascending: true }),
    supabase.from("orders")
      .select("id,order_number,recipient_name,recipient_phone,shipping_address,subtotal,gift_card_fee,shipping_cost,total_amount,order_status,payment_status,shipping_quote_status,payment_method,created_at")
      .order("created_at", { ascending: false }).limit(500),
    supabase.from("products")
      .select("id,name,slug,description,price,compare_at_price,stock,sku,weight_gram,status,moderation_note,created_at,seller_id,category_id,metadata,delivery_type,is_gift_card_enabled"),
    supabase.from("seller_profiles")
      .select("user_id,business_name,slug,description,phone,email,address,logo_url,banner_url,status,created_at"),
  ]);

  for (const [name, result] of [
    ["moderasi", pendingResult], ["pesanan", orderResult],
    ["statistik produk", productStatsResult], ["mitra", sellerResult],
  ] as const) {
    if (result.error) {
      console.error("Admin overview " + name + ":", result.error);
      return NextResponse.json({ error: "Gagal memuat " + name + "." }, { status: 500 });
    }
  }

  const pending = pendingResult.data ?? [];
  const orders = orderResult.data ?? [];
  const allProducts = productStatsResult.data ?? [];
  const sellers = sellerResult.data ?? [];
  const productIds = [...new Set(allProducts.map((product) => product.id))];
  const categoryIds = [...new Set(allProducts.map((product) => product.category_id).filter(Boolean))];
  const orderIds = orders.map((order) => order.id);

  const [categoryNames, itemResult, imageResult, moderationResult] = await Promise.all([
    categoryIds.length
      ? supabase.from("categories").select("id,name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? supabase.from("order_items").select("order_id,product_id,product_name,quantity,line_total").in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? supabase.from("product_images").select("product_id,image_url,alt_text,sort_order").in("product_id", productIds).order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? supabase.from("product_moderation_events")
          .select("id,product_id,actor_id,action,reason,previous_status,new_status,created_at")
          .in("product_id", productIds).order("created_at", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (categoryNames.error || itemResult.error || imageResult.error || moderationResult.error) {
    console.error("Admin overview catalog detail:", categoryNames.error || itemResult.error || imageResult.error || moderationResult.error);
    return NextResponse.json({ error: "Gagal memuat detail katalog atau transaksi." }, { status: 500 });
  }

  const sellerMap = new Map(sellers.map((seller) => [seller.user_id, seller]));
  const categoryMap = new Map((categoryNames.data ?? []).map((category) => [category.id, category.name]));
  const imageMap = new Map<string, { url: string; alt: string | null }[]>();
  for (const image of imageResult.data ?? []) {
    const list = imageMap.get(image.product_id) ?? [];
    list.push({ url: image.image_url, alt: image.alt_text ?? null });
    imageMap.set(image.product_id, list);
  }
  const moderationMap = new Map<string, {
    id: string; actor_id: string | null; action: string; reason: string;
    previous_status: string | null; new_status: string | null; created_at: string;
  }[]>();
  for (const event of moderationResult.data ?? []) {
    const list = moderationMap.get(event.product_id) ?? [];
    list.push({
      id: event.id, actor_id: event.actor_id, action: event.action, reason: event.reason,
      previous_status: event.previous_status, new_status: event.new_status, created_at: event.created_at,
    });
    moderationMap.set(event.product_id, list);
  }

  const items = new Map<string, { product_name: string; quantity: number; line_total: number }[]>();
  for (const item of itemResult.data ?? []) {
    const list = items.get(item.order_id) ?? [];
    list.push({ product_name: item.product_name, quantity: item.quantity, line_total: Number(item.line_total) });
    items.set(item.order_id, list);
  }

  const normalizedOrders = orders.map((order) => ({
    ...order,
    subtotal: Number(order.subtotal),
    gift_card_fee: Number(order.gift_card_fee),
    shipping_cost: Number(order.shipping_cost),
    total_amount: Number(order.total_amount),
    order_items: items.get(order.id) ?? [],
  }));
  const paid = normalizedOrders.filter((order) => order.payment_status === "paid");
  const paidOrderIds = new Set(paid.map((order) => order.id));
  const salesByProduct = new Map<string, number>();
  for (const item of itemResult.data ?? []) {
    if (item.product_id && paidOrderIds.has(item.order_id)) {
      salesByProduct.set(item.product_id, (salesByProduct.get(item.product_id) ?? 0) + Number(item.quantity ?? 0));
    }
  }

  const normalizeProduct = (product: (typeof allProducts)[number]) => {
    const seller = sellerMap.get(product.seller_id);
    const storedImages = imageMap.get(product.id) ?? [];
    const metadataImage = typeof product.metadata?.image === "string" && product.metadata.image
      ? [{ url: product.metadata.image, alt: typeof product.metadata.imageAlt === "string" ? product.metadata.imageAlt : product.name }]
      : [];
    const seen = new Set<string>();
    const images = [...metadataImage, ...storedImages].filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });

    return {
      ...product,
      price: Number(product.price),
      sales_count: salesByProduct.get(product.id) ?? 0,
      seller_name: seller?.business_name ?? "Mitra UMKM",
      seller_details: seller ? {
        user_id: seller.user_id,
        business_name: seller.business_name,
        slug: seller.slug,
        description: seller.description,
        phone: seller.phone,
        email: seller.email,
        address: seller.address,
        logo_url: seller.logo_url,
        banner_url: seller.banner_url,
        status: seller.status,
        created_at: seller.created_at,
      } : null,
      category_name: categoryMap.get(product.category_id) ?? "Tanpa kategori",
      images,
      moderation_history: moderationMap.get(product.id) ?? [],
    };
  };

  const now = new Date();
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const daily = paid.filter((order) => order.created_at.slice(0, 10) === key);
    return {
      date: key,
      label: day.toLocaleDateString("id-ID", { weekday: "short" }),
      orders: daily.length,
      revenue: daily.reduce((sum, order) => sum + order.total_amount, 0),
    };
  });

  return NextResponse.json({
    notifications: notifications ?? [],
    products: pending.map(normalizeProduct),
    catalog: allProducts.map(normalizeProduct),
    orders: normalizedOrders,
    metrics: {
      totalOrders: normalizedOrders.length,
      paidOrders: paid.length,
      pendingShipping: normalizedOrders.filter((order) => order.payment_status === "pending" && order.shipping_quote_status === "pending").length,
      revenue: paid.reduce((sum, order) => sum + order.total_amount, 0),
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter((product) => product.status === "active").length,
      pendingProducts: allProducts.filter((product) => product.status === "pending_review").length,
      lowStock: allProducts.filter((product) => product.status === "active" && product.stock <= 5).length,
      totalSellers: sellers.length,
      activeSellers: sellers.filter((seller) => seller.status === "approved").length,
    },
    trend,
    sellers: sellers.map((seller) => ({
      user_id: seller.user_id,
      name: seller.business_name,
      slug: seller.slug,
      description: seller.description,
      phone: seller.phone,
      email: seller.email,
      address: seller.address,
      logo_url: seller.logo_url,
      banner_url: seller.banner_url,
      status: seller.status,
      created_at: seller.created_at,
    })),
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
