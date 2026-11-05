import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login ulang." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });

  const { data: ownItems, error: itemError } = await supabase.from("order_items")
    .select("order_id,product_id,product_name,product_image_url,sku,unit_price,quantity,line_total")
    .eq("seller_id", user.id).order("created_at", { ascending: false });
  if (itemError) {
    console.error("Seller order items:", itemError);
    return NextResponse.json({ error: "Gagal mengambil item pesanan mitra." }, { status: 500 });
  }
  const orderIds = [...new Set((ownItems ?? []).map(item => item.order_id))];
  if (!orderIds.length) return NextResponse.json({ orders: [] });

  const { data: orders, error: orderError } = await supabase.from("orders")
    .select("id,order_number,recipient_name,recipient_phone,shipping_address,subtotal,shipping_cost,total_amount,order_status,payment_status,created_at,shipped_at,tracking_number,shipping_courier")
    .in("id", orderIds).order("created_at", { ascending: false });
  if (orderError) {
    console.error("Seller orders:", orderError);
    return NextResponse.json({ error: "Gagal mengambil pesanan mitra." }, { status: 500 });
  }

  const byOrder = new Map<string, typeof ownItems>();
  for (const item of ownItems ?? []) {
    const current = byOrder.get(item.order_id) ?? [];
    current.push(item);
    byOrder.set(item.order_id, current);
  }
  return NextResponse.json({ orders: (orders ?? []).map(order => ({
    ...order,
    subtotal: Number(order.subtotal), shipping_cost: Number(order.shipping_cost), total_amount: Number(order.total_amount),
    items: (byOrder.get(order.id) ?? []).map(item => ({ ...item, unit_price: Number(item.unit_price), line_total: Number(item.line_total) })),
  })) });
}
