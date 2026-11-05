import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akses khusus admin." }, { status: 403 });

  const [productsResult, ordersResult] = await Promise.all([
    supabase.from("products").select("id,name,slug,description,price,stock,status,created_at,seller_id,categories(name),seller_profiles(business_name)").eq("status","pending_review").order("created_at",{ascending:true}),
    supabase.from("orders").select("id,order_number,recipient_name,recipient_phone,shipping_address,subtotal,gift_card_fee,shipping_cost,total_amount,shipping_quote_status,payment_status,created_at,order_items(product_name,quantity,line_total)").eq("payment_status","pending").eq("shipping_quote_status","pending").order("created_at",{ascending:true}),
  ]);
  if (productsResult.error || ordersResult.error) return NextResponse.json({ error: "Gagal memuat data admin." }, { status: 500 });
  return NextResponse.json({ products: productsResult.data ?? [], orders: ordersResult.data ?? [] });
}
